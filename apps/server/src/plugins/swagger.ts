import swagger from "@fastify/swagger";
import scalar from "@scalar/fastify-api-reference";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
	await fastify.register(swagger, {
		openapi: {
			openapi: "3.0.0",
			info: {
				title: "Omnia API",
				description: "Documentação da API do sistema de Omnia",
				version: "1.0.0",
			},
			servers: [
				{
					url: "http://localhost:4444",
					description: "Development server",
				},
			],
			components: {
				securitySchemes: {
					bearerAuth: {
						type: "http",
						scheme: "bearer",
						bearerFormat: "JWT",
					},
				},
			},
		},
	});

	await fastify.register(scalar, {
		routePrefix: "/api/docs",
		configuration: {
			theme: "fastify",
			metaData: {
				title: "Omnia API Docs",
			},
		},
	});
};

export default fp(swaggerPlugin);
