import { db } from "@omnia/db";
import { documents, documentVersions } from "@omnia/db/schema";
import { eq } from "drizzle-orm";
import { searchDocumentChunks } from "./vector-store";

const SIMILARITY_THRESHOLD = 0.3;

export type EnrichedChunk = {
	chunkId: number;
	content: string;
	metadata: Record<string, unknown>;
	similarity: number;
	documentVersionId: number;
	documentName: string;
};

export const retrieveChunks = async (
	queryEmbedding: number[],
	topK = 5
): Promise<EnrichedChunk[]> => {
	const chunks = await searchDocumentChunks(queryEmbedding, topK);

	const filtered = chunks.filter((c) => c.similarity > SIMILARITY_THRESHOLD);

	const enriched = await Promise.all(
		filtered.map(async (chunk) => {
			const version = await db
				.select({ documentId: documentVersions.documentId })
				.from(documentVersions)
				.where(eq(documentVersions.id, chunk.documentVersionId))
				.limit(1);

			const versionRow = version[0];
			if (!versionRow) {
				return null;
			}

			const doc = await db
				.select({ name: documents.name })
				.from(documents)
				.where(eq(documents.id, versionRow.documentId))
				.limit(1);

			const docRow = doc[0];
			if (!docRow) {
				return null;
			}

			return { ...chunk, documentName: docRow.name };
		})
	);

	return enriched.filter((c): c is EnrichedChunk => c !== null);
};
