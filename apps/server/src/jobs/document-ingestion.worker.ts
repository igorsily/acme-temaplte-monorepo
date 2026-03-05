import { readFile } from "node:fs/promises";
import { db } from "@omnia/db";
import { DrizzleDocumentRepository } from "@omnia/db/repositories/document.repository";
import {
	documentChunks,
	documentEmbeddings,
	documentVersions,
} from "@omnia/db/schema";
import { env } from "@omnia/env/server";
import { chunkText, embedTexts, parseDocument } from "@omnia/rag";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";

export type IngestionJobData = {
	documentVersionId: number;
	filePath: string;
	mimeType: string;
	documentId: number;
};

const BATCH_SIZE = 50;

const repository = new DrizzleDocumentRepository(db);

const processJob = async (data: IngestionJobData): Promise<void> => {
	const { documentVersionId, filePath, mimeType, documentId } = data;

	await repository.updateVersionStatus(documentVersionId, "processing");

	const buffer = await readFile(filePath);
	const text = await parseDocument(buffer, mimeType);
	const chunks = chunkText(text);

	// Batch embeddings in groups of BATCH_SIZE to respect OpenAI limits
	const allEmbeddings: number[][] = [];
	for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
		const batch = chunks.slice(i, i + BATCH_SIZE);
		const batchTexts = batch.map((c) => c.content);
		const embeddings = await embedTexts(batchTexts);
		allEmbeddings.push(...embeddings);
	}

	// Persist chunks + embeddings in a transaction
	await db.transaction(async (tx) => {
		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			const embedding = allEmbeddings[i];

			if (!(chunk && embedding)) {
				continue;
			}

			const [insertedChunk] = await tx
				.insert(documentChunks)
				.values({
					documentVersionId,
					content: chunk.content,
					chunkIndex: chunk.chunkIndex,
					metadata: {},
				})
				.returning({ id: documentChunks.id });

			if (!insertedChunk) {
				throw new Error("Failed to insert chunk");
			}

			await tx.insert(documentEmbeddings).values({
				chunkId: insertedChunk.id,
				embedding,
			});
		}
	});

	// Flip active version: deactivate all, then activate this one
	await repository.deactivateVersions(documentId);
	await db
		.update(documentVersions)
		.set({ isActive: true })
		.where(eq(documentVersions.id, documentVersionId));
	await repository.updateVersionStatus(documentVersionId, "active");
};

export const createDocumentIngestionWorker = () => {
	const connection = {
		host: env.REDIS_HOST,
		port: env.REDIS_PORT,
	};

	const worker = new Worker<IngestionJobData>(
		"document-ingestion",
		async (job) => {
			try {
				await processJob(job.data);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				await repository.updateVersionStatus(
					job.data.documentVersionId,
					"error",
					message
				);
				throw err;
			}
		},
		{
			connection,
			concurrency: 2,
		}
	);

	return worker;
};
