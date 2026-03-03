import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

import corsPlugin from "./cors";
import errorHandlerPlugin from "./error-handler";
import swaggerPlugin from "./swagger";
import trpcPlugin from "./trpc";

const plugins: FastifyPluginAsync = async (fastify) => {
	await fastify.register(errorHandlerPlugin);
	await fastify.register(corsPlugin);
	await fastify.register(trpcPlugin);
	await fastify.register(swaggerPlugin);
};

export default fp(plugins);
