import { publicProcedure, router } from "../index";
import { documentsRouter } from "./documents";
import { fooRouter } from "./foo";

export const appRouter = router({
	healthCheck: publicProcedure.query(() => {
		return "OK";
	}),
	documents: documentsRouter,
	foo: fooRouter,
});
export type AppRouter = typeof appRouter;
