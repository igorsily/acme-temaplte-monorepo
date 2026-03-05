import { env } from "@omnia/env/server";
import { buildApp } from "./app";
import { createDocumentIngestionWorker } from "./jobs/document-ingestion.worker";

const startServer = async () => {
	try {
		const app = await buildApp();
		const worker = createDocumentIngestionWorker();

		app.addHook("onClose", async () => {
			await worker.close();
		});

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
