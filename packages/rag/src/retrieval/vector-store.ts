import { db } from "@omnia/db";
import {
	documentChunks,
	documentEmbeddings,
	schemaEmbeddings,
} from "@omnia/db/schema";
import { sql } from "drizzle-orm";

export interface RetrievedChunk {
	chunkId: number;
	content: string;
	documentVersionId: number;
	metadata: Record<string, unknown>;
	similarity: number;
}

export interface RetrievedSchema {
	columnInfo: unknown;
	similarity: number;
	tableName: string;
}

const toVectorLiteral = (embedding: number[]): string => {
	if (!embedding.every((n) => Number.isFinite(n))) {
		throw new Error("Invalid embedding: all values must be finite numbers");
	}
	return `[${embedding.join(",")}]`;
};

export const searchDocumentChunks = async (
	queryEmbedding: number[],
	topK = 5
): Promise<RetrievedChunk[]> => {
	const vectorLiteral = toVectorLiteral(queryEmbedding);

	const rows = await db
		.select({
			chunkId: documentChunks.id,
			content: documentChunks.content,
			metadata: documentChunks.metadata,
			documentVersionId: documentChunks.documentVersionId,
			similarity: sql<number>`1 - (${documentEmbeddings.embedding} <=> ${sql.raw(`'${vectorLiteral}'::vector`)})`,
		})
		.from(documentEmbeddings)
		.innerJoin(
			documentChunks,
			sql`${documentEmbeddings.chunkId} = ${documentChunks.id}`
		)
		.orderBy(
			sql`${documentEmbeddings.embedding} <=> ${sql.raw(`'${vectorLiteral}'::vector`)}`
		)
		.limit(topK);

	return rows as RetrievedChunk[];
};

export const searchSchemaEmbeddings = async (
	queryEmbedding: number[],
	topK = 3
): Promise<RetrievedSchema[]> => {
	const vectorLiteral = toVectorLiteral(queryEmbedding);

	const rows = await db
		.select({
			tableName: schemaEmbeddings.tableName,
			columnInfo: schemaEmbeddings.columnInfo,
			similarity: sql<number>`1 - (${schemaEmbeddings.embedding} <=> ${sql.raw(`'${vectorLiteral}'::vector`)})`,
		})
		.from(schemaEmbeddings)
		.orderBy(
			sql`${schemaEmbeddings.embedding} <=> ${sql.raw(`'${vectorLiteral}'::vector`)}`
		)
		.limit(topK);

	return rows as RetrievedSchema[];
};
