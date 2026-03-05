import { Queue } from "bullmq";
import fp from "fastify-plugin";
import { redisConnection } from "@/lib/redis";

export default fp((fastify) => {
	const queue = new Queue("document-ingestion", {
		connection: redisConnection,
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

	fastify.decorate("documentIngestionQueue", queue);

	fastify.addHook("onClose", async () => {
		await queue.close();
	});
});
