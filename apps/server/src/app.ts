import { env } from "@omnia/env/server";
import Fastify from "fastify";
import plugins from "./plugins";
import routes from "./routes";

export async function buildApp() {
	const isDev = env.NODE_ENV !== "production";

	const app = Fastify({
		logger: {
			level: isDev ? "debug" : "info",
			redact: [
				"req.headers.authorization",
				"req.headers.cookie",
				"body.password",
				"*.token",
			],
			transport: isDev
				? {
						target: "pino-pretty",
						options: {
							colorize: true,
							translateTime: "SYS:HH:MM:ss",
							ignore: "pid,hostname",
						},
					}
				: undefined,
		},
	});

	// Register Core Plugins
	await app.register(plugins);

	// Register Routes
	await app.register(routes, { prefix: "/api" });

	return app;
}
