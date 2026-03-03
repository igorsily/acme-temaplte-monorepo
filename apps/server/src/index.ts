import { env } from "@acme/env/server";
import { buildApp } from "./app";

const startServer = async () => {
	try {
		const app = await buildApp();

		await app.listen({
			port: env.PORT,
			host: "0.0.0.0",
		});

		app.swagger();
		app.log.info(
			`Documentation available at http://localhost:${env.PORT}/api/docs`
		);
		app.log.info(
			`Documentation authentication available at http://localhost:${env.PORT}/api/auth/reference`
		);
	} catch (error) {
		console.error("Error starting server:", error);
		process.exit(1);
	}
};

startServer();
