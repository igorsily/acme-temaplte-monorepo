import { db } from "@acme/db";
import * as schema from "@acme/db/schema/auth";
import { env } from "@acme/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema,
	}),
	trustedOrigins: [env.CORS_ORIGIN],
	emailAndPassword: {
		enabled: true,
	},
	// secondaryStorage: {
	// 	get: async (key) => {
	// 		const value = await redis.get(key);
	// 		return value ? value : null;
	// 	},
	// 	set: async (key, value, ttl) => {
	// 		if (ttl) {
	// 			await redis.set(key, value, "EX", ttl);
	// 		} else {
	// 			await redis.set(key, value);
	// 		}
	// 	},
	// 	delete: async (key) => {
	// 		await redis.del(key);
	// 	},
	// },
	advanced: {
		database: {
			generateId: false,
		},
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			httpOnly: true,
		},
	},
	plugins: [
		username({
			displayUsernameNormalization: (username) => username.trim().toLowerCase(),
		}),
	],
});
