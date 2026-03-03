import { pgTable, text } from "drizzle-orm/pg-core";
import { baseColumnsWithUserId } from "./base-columns";

export const foo = pgTable("foo", {
	...baseColumnsWithUserId(),
	name: text("name").notNull(),
	value: text("value"),
});
