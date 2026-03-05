import { db } from "@omnia/db";
import { DrizzleDocumentRepository } from "@omnia/db/repositories/document.repository";
import { env } from "@omnia/env/server";
import { buildApp } from "./app";
import { createDocumentIngestionWorker } from "./jobs/document-ingestion.worker";

const startServer = async () => {
	try {
		const app = await buildApp();

		const repository = new DrizzleDocumentRepository(db);
		const worker = createDocumentIngestionWorker(repository);

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
