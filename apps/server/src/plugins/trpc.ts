import { createContext } from "@omnia/api/context";
import { type AppRouter, appRouter } from "@omnia/api/routers/index";
import {
	type FastifyTRPCPluginOptions,
	fastifyTRPCPlugin,
} from "@trpc/server/adapters/fastify";
import fp from "fastify-plugin";
import { servicesFactory } from "@/services-factory";

export default fp(async (fastify) => {
	const services = servicesFactory(fastify.documentIngestionQueue);

	await fastify.register(fastifyTRPCPlugin, {
		prefix: "/api/trpc",
		trpcOptions: {
			router: appRouter,
			createContext: (opts) => createContext(opts, services),
			onError({ path, error }) {
				fastify.log.error(
					{ err: error },
					`Error in tRPC handler on path '${path}':`
				);
			},
		} satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
	});
});
