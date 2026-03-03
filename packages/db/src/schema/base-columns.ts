import { bigint, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const baseColumns = () => ({
	id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
});

export const baseColumnsWithUserId = () => ({
	...baseColumns(),
	userId: bigint("user_id", { mode: "number" })
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});
