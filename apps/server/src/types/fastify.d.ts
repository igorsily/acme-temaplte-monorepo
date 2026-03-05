import type { Queue } from "bullmq";
import type { IngestionJobData } from "@/jobs/document-ingestion.worker";

declare module "fastify" {
	interface FastifyInstance {
		documentIngestionQueue: Queue<IngestionJobData>;
	}
}
