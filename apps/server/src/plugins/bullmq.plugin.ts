import { env } from "@omnia/env/server";
import { Queue } from "bullmq";
import fp from "fastify-plugin";

const connection = {
	host: env.REDIS_HOST,
	port: env.REDIS_PORT,
};

export const documentIngestionQueue = new Queue("document-ingestion", {
	connection,
	defaultJobOptions: {
		attempts: 3,
		backoff: {
			type: "exponential",
			delay: 5000,
		},
		removeOnComplete: 100,
		removeOnFail: 500,
	},
});

export default fp(async (_fastify) => {
	// Queue is created at module level; plugin ensures it's closed on shutdown
	_fastify.addHook("onClose", async () => {
		await documentIngestionQueue.close();
	});
});
