import {
	bigint,
	boolean,
	integer,
	pgEnum,
	pgTable,
	text,
} from "drizzle-orm/pg-core";
import { baseColumnsWithUserId } from "./base-columns";

export const documentStatusEnum = pgEnum("document_status", [
	"pending",
	"processing",
	"active",
	"error",
]);

export const documents = pgTable("documents", {
	...baseColumnsWithUserId(),
	name: text("name").notNull(),
	mimeType: text("mime_type").notNull(),
	deletedAt: text("deleted_at"),
});

export const documentVersions = pgTable("document_versions", {
	...baseColumnsWithUserId(),
	documentId: bigint("document_id", { mode: "number" })
		.notNull()
		.references(() => documents.id, { onDelete: "cascade" }),
	version: integer("version").notNull().default(1),
	filePath: text("file_path").notNull(),
	fileSize: integer("file_size").notNull(),
	status: documentStatusEnum("status").notNull().default("pending"),
	isActive: boolean("is_active").notNull().default(false),
	errorMessage: text("error_message"),
});
