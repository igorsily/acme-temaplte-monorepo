import fastifyCors from "@fastify/cors";
import { env } from "@omnia/env/server";
import fp from "fastify-plugin";

const baseCorsConfig = {
	origin: env.CORS_ORIGIN,
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
	credentials: true,
	maxAge: 86_400,
};

export default fp(async (fastify) => {
	await fastify.register(fastifyCors, baseCorsConfig);
});
