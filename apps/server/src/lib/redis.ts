import { env } from "@omnia/env/server";

export const redisConnection = {
	host: env.REDIS_HOST,
	port: env.REDIS_PORT,
};
