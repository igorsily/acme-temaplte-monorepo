import type { FastifyPluginAsync } from "fastify";

import authRoutes from "./auth";
import documentsRoutes from "./documents";
import healthRoutes from "./health";
import ragRoutes from "./rag";

const routes: FastifyPluginAsync = async (fastify) => {
	await fastify.register(healthRoutes, { prefix: "/health" });
	await fastify.register(authRoutes, { prefix: "/auth" });
	await fastify.register(documentsRoutes, { prefix: "/documents" });
	await fastify.register(ragRoutes, { prefix: "/rag" });
};

export default routes;
