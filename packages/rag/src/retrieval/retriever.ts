import { db } from "@omnia/db";
import { documents, documentVersions } from "@omnia/db/schema";
import { eq, inArray } from "drizzle-orm";
import { searchDocumentChunks } from "./vector-store";

const SIMILARITY_THRESHOLD = 0.3;

export interface EnrichedChunk {
	chunkId: number;
	content: string;
	documentName: string;
	documentVersionId: number;
	metadata: Record<string, unknown>;
	similarity: number;
}

interface VersionNameRow {
	documentName: string;
	versionId: number;
}

export const retrieveChunks = async (
	queryEmbedding: number[],
	topK = 5
): Promise<EnrichedChunk[]> => {
	const chunks = await searchDocumentChunks(queryEmbedding, topK);
	const filtered = chunks.filter((c) => c.similarity > SIMILARITY_THRESHOLD);

	if (filtered.length === 0) {
		return [];
	}

	const versionIds = filtered.map((c) => c.documentVersionId);

	const rows: VersionNameRow[] = await db
		.select({
			versionId: documentVersions.id,
			documentName: documents.name,
		})
		.from(documentVersions)
		.innerJoin(documents, eq(documentVersions.documentId, documents.id))
		.where(inArray(documentVersions.id, versionIds));

	const nameByVersionId = new Map<number, string>(
		rows.map((r) => [r.versionId, r.documentName])
	);

	return filtered.flatMap((chunk) => {
		const documentName = nameByVersionId.get(chunk.documentVersionId);
		if (!documentName) {
			return [];
		}
		return [{ ...chunk, documentName }];
	});
};
