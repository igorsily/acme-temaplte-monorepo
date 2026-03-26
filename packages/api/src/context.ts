import { auth } from "@omnia/auth";
import type { Services } from "@omnia/core";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { fromNodeHeaders } from "better-auth/node";

export interface Context {
	services: Services;
	session: Awaited<ReturnType<typeof auth.api.getSession>>;
}

export async function createContext(
	opts: CreateFastifyContextOptions,
	services: Services
): Promise<Context> {
	const { req } = opts;

	const session = await auth.api.getSession({
		headers: fromNodeHeaders(req.headers),
	});

	return { session, services };
}
