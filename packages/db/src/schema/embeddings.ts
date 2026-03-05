import {
	bigint,
	customType,
	index,
	integer,
	jsonb,
	pgTable,
	text,
} from "drizzle-orm/pg-core";
import { baseColumns } from "./base-columns";
import { documentVersions } from "./documents";

export const vector = (name: string, dimensions: number) =>
	customType<{ data: number[]; driverData: string }>({
		dataType() {
			return `vector(${dimensions})`;
		},
		toDriver(value) {
			return `[${value.join(",")}]`;
		},
		fromDriver(value) {
			return value.slice(1, -1).split(",").map(Number);
		},
	})(name);

export const documentChunks = pgTable("document_chunks", {
	...baseColumns(),
	documentVersionId: bigint("document_version_id", { mode: "number" })
		.notNull()
		.references(() => documentVersions.id, { onDelete: "cascade" }),
	content: text("content").notNull(),
	chunkIndex: integer("chunk_index").notNull(),
	metadata: jsonb("metadata").notNull().default({}),
});

export const documentEmbeddings = pgTable(
	"document_embeddings",
	{
		...baseColumns(),
		chunkId: bigint("chunk_id", { mode: "number" })
			.notNull()
			.references(() => documentChunks.id, { onDelete: "cascade" }),
		embedding: vector("embedding", 1536).notNull(),
	},
	(t) => [
		index("document_embeddings_hnsw_idx")
			.using("hnsw", t.embedding)
			.with({ m: 16, ef_construction: 64 }),
	]
);
