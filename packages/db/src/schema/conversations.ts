import { bigint, jsonb, pgEnum, pgTable, text } from "drizzle-orm/pg-core";
import { baseColumns, baseColumnsWithUserId } from "./base-columns";

export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);

export const conversations = pgTable("conversations", {
	...baseColumnsWithUserId(),
	title: text("title"),
});

export const conversationMessages = pgTable("conversation_messages", {
	...baseColumns(),
	conversationId: bigint("conversation_id", { mode: "number" })
		.notNull()
		.references(() => conversations.id, { onDelete: "cascade" }),
	role: messageRoleEnum("role").notNull(),
	content: text("content").notNull(),
	sources: jsonb("sources").notNull().default([]),
});
