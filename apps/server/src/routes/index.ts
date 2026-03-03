import type { FastifyPluginAsync } from "fastify";

import authRoutes from "./auth";
import healthRoutes from "./health";

const routes: FastifyPluginAsync = async (fastify) => {
	await fastify.register(healthRoutes, { prefix: "/health" });
	await fastify.register(authRoutes, { prefix: "/auth" });
};

export default routes;
