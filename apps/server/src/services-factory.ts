import type { Services } from "@acme/core";
import { FooService } from "@acme/core/services/foo.service";
import { db } from "@acme/db";
import { DrizzleFooRepository } from "@acme/db/repositories/foo.repository";

export const servicesFactory = (): Services => {
	const fooRepository = new DrizzleFooRepository(db);

	return {
		fooService: new FooService(fooRepository),
	};
};
