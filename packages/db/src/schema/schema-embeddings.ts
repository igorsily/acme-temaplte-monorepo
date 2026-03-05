import { index, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { baseColumns } from "./base-columns";
import { vector } from "./embeddings";

export const schemaEmbeddings = pgTable(
	"schema_embeddings",
	{
		...baseColumns(),
		tableName: text("table_name").notNull(),
		columnInfo: jsonb("column_info").notNull(),
		description: text("description").notNull(),
		embedding: vector("embedding", 1536).notNull(),
	},
	(t) => [
		index("schema_embeddings_hnsw_idx")
			.using("hnsw", t.embedding)
			.with({ m: 16, ef_construction: 64 }),
	]
);
