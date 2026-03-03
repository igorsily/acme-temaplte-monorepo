import type { FastifyError, FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";

const errorHandlerPlugin: FastifyPluginCallback = (fastify, _options, done) => {
	fastify.setErrorHandler((error: FastifyError, request, reply) => {
		// Log the error
		request.log.error({ err: error }, "Request error:");

		// Handle validation errors
		if (error.validation) {
			return reply.code(400).send({
				statusCode: 400,
				error: "Bad Request",
				message: "Validation failed",
				details: error.validation,
			});
		}

		// Handle known errors with status codes
		const statusCode = error.statusCode ?? 500;
		const code = error.code ?? "INTERNAL_ERROR";

		// Don't expose internal error details in production
		const message =
			statusCode >= 500 && process.env.NODE_ENV === "production"
				? "Internal Server Error"
				: error.message;

		return reply.code(statusCode).send({
			statusCode,
			error: code,
			message,
		});
	});
	done();
};

export default fp(errorHandlerPlugin);
