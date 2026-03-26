import { env } from "@omnia/env/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const isProd = process.env.NODE_ENV === "production";

const sql = postgres(env.DATABASE_URL, {
	max: 1,
	ssl: isProd ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(sql, {
	schema,
	casing: "snake_case",
});
