import multipart from "@fastify/multipart";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import bullmqPlugin from "./bullmq.plugin";
import corsPlugin from "./cors";
import errorHandlerPlugin from "./error-handler";
import swaggerPlugin from "./swagger";
import trpcPlugin from "./trpc";

const plugins: FastifyPluginAsync = async (fastify) => {
	await fastify.register(errorHandlerPlugin);
	await fastify.register(corsPlugin);
	await fastify.register(multipart, {
		limits: { fileSize: 50 * 1024 * 1024 },
	});
	await fastify.register(bullmqPlugin);
	await fastify.register(trpcPlugin);
	await fastify.register(swaggerPlugin);
};

export default fp(plugins);
