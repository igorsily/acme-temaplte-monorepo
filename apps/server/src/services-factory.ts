import type { Services } from "@omnia/core";
import { DocumentService } from "@omnia/core/services/document.service";
import { FooService } from "@omnia/core/services/foo.service";
import { db } from "@omnia/db";
import { DrizzleDocumentRepository } from "@omnia/db/repositories/document.repository";
import { DrizzleFooRepository } from "@omnia/db/repositories/foo.repository";
import { documentIngestionQueue } from "./plugins/bullmq.plugin";

let instance: Services | null = null;

export const servicesFactory = (): Services => {
	if (instance) {
		return instance;
	}

	const fooRepository = new DrizzleFooRepository(db);
	const documentRepository = new DrizzleDocumentRepository(db);

	instance = {
		documentService: new DocumentService(
			documentRepository,
			documentIngestionQueue
		),
		fooService: new FooService(fooRepository),
	};

	return instance;
};
