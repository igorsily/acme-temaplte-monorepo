import { readFile } from "node:fs/promises";
import type { DocumentRepository } from "@omnia/core/repositories/document.repository";
import { db } from "@omnia/db";
import {
	documentChunks,
	documentEmbeddings,
	documentVersions,
} from "@omnia/db/schema";
import { chunkText, embedTexts, parseDocument } from "@omnia/rag";
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import { redisConnection } from "@/lib/redis";

export interface IngestionJobData {
	documentId: number;
	documentVersionId: number;
	filePath: string;
	mimeType: string;
}

const BATCH_SIZE = 50;

const processJob = async (
	data: IngestionJobData,
	repository: DocumentRepository
): Promise<void> => {
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

export const createDocumentIngestionWorker = (
	repository: DocumentRepository
) => {
	const worker = new Worker<IngestionJobData>(
		"document-ingestion",
		async (job) => {
			try {
				await processJob(job.data, repository);
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
			connection: redisConnection,
			concurrency: 2,
		}
	);

	return worker;
};
