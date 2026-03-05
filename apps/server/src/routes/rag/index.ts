import { auth } from "@omnia/auth";
import { db } from "@omnia/db";
import { schemaEmbeddings } from "@omnia/db/schema";
import { embedTexts } from "@omnia/rag";
import { fromNodeHeaders } from "better-auth/node";
import { sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";

type ColumnInfo = {
	column_name: string;
	data_type: string;
	is_nullable: string;
};

type TableInfo = {
	table_name: string;
	columns: ColumnInfo[];
};

const ragRoutes: FastifyPluginAsync = async (fastify) => {
	// POST /api/rag/schema/reindex
	fastify.post("/schema/reindex", async (request, reply) => {
		const session = await auth.api.getSession({
			headers: fromNodeHeaders(request.headers),
		});

		if (!session) {
			return reply.status(401).send({ error: "Unauthorized" });
		}

		// Query information_schema for all user tables and their columns
		const rows = await db.execute<{
			table_name: string;
			column_name: string;
			data_type: string;
			is_nullable: string;
		}>(sql`
      SELECT
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable
      FROM information_schema.tables t
      JOIN information_schema.columns c
        ON t.table_name = c.table_name
        AND t.table_schema = c.table_schema
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name, c.ordinal_position
    `);

		// Group columns by table
		const tableMap = new Map<string, TableInfo>();
		for (const row of rows) {
			const existing = tableMap.get(row.table_name);
			if (existing) {
				existing.columns.push({
					column_name: row.column_name,
					data_type: row.data_type,
					is_nullable: row.is_nullable,
				});
			} else {
				tableMap.set(row.table_name, {
					table_name: row.table_name,
					columns: [
						{
							column_name: row.column_name,
							data_type: row.data_type,
							is_nullable: row.is_nullable,
						},
					],
				});
			}
		}

		const tables = Array.from(tableMap.values());

		if (tables.length === 0) {
			return reply.send({ reindexed: 0 });
		}

		// Build text descriptions for embedding
		const descriptions = tables.map((t) => {
			const cols = t.columns
				.map(
					(c) =>
						`${c.column_name} (${c.data_type}${c.is_nullable === "NO" ? ", NOT NULL" : ""})`
				)
				.join(", ");
			return `Table ${t.table_name}: ${cols}`;
		});

		const embeddings = await embedTexts(descriptions);

		// Upsert: delete all + re-insert
		await db.transaction(async (tx) => {
			await tx.delete(schemaEmbeddings);

			for (let i = 0; i < tables.length; i++) {
				const table = tables[i];
				const embedding = embeddings[i];

				if (!(table && embedding)) {
					continue;
				}

				await tx.insert(schemaEmbeddings).values({
					tableName: table.table_name,
					columnInfo: table.columns,
					description: descriptions[i] ?? "",
					embedding,
				});
			}
		});

		return reply.send({ reindexed: tables.length });
	});
};

export default ragRoutes;
