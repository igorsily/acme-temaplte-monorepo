import { publicProcedure, router } from "../index";
import { fooRouter } from "./foo";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	foo: fooRouter,
});
export type AppRouter = typeof appRouter;
