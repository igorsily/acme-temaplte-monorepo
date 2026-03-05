import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";

export const t = initTRPC.context<Context>().create({
	transformer: superjson,
	errorFormatter: ({ shape, error }) => {
		console.log(error);
		return {
			...shape,
			code: error.code,
			message: error.message,
			cause: error.cause,
			stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
		};
	},
});
export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.session) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication required",
		});
	}
	return next({
		ctx: {
			...ctx,
			session: ctx.session,
			userId: Number(ctx.session.user.id),
		},
	});
});
