import { auth } from "@acme/auth";
import type { FastifyPluginCallback } from "fastify";

const authRoutes: FastifyPluginCallback = (fastify, _options, done) => {
	fastify.all(
		"/*",
		{
			schema: {
				hide: true,
			},
		},
		async (request, reply) => {
			try {
				const url = new URL(request.url, `http://${request.headers.host}`);

				const headers = new Headers();

				for (const [key, value] of Object.entries(request.headers)) {
					if (value) {
						headers.append(key, String(value));
					}
				}

				const req = new Request(url.toString(), {
					method: request.method,
					headers,
					body:
						request.body && request.method !== "GET"
							? JSON.stringify(request.body)
							: undefined,
				});

				const response = await auth.handler(req);

				reply.status(response.status);

				response.headers.forEach((value, key) => {
					reply.header(key, value);
				});

				const text = await response.text();
				reply.send(text);
			} catch (error) {
				fastify.log.error({ err: error }, "Authentication Error");

				reply.status(500).send({
					error: "Internal authentication error",
					code: "AUTH_FAILURE",
				});
			}
		}
	);

	done();
};

export default authRoutes;
