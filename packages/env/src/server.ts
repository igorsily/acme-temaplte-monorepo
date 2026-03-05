import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		PORT: z.coerce.number().default(3001),
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CORS_ORIGIN: z.url(),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		OPENAI_API_KEY: z.string().min(1),
		REDIS_HOST: z.string().default("localhost"),
		REDIS_PORT: z.coerce.number().default(6379),
		RAG_UPLOAD_DIR: z.string().default("/tmp/omnia-uploads"),
		RAG_MAX_FILE_SIZE_MB: z.coerce.number().default(50),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
