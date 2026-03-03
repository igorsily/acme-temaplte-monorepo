import { listParamsSchema } from "@acme/types";
import {
	createFooSchema,
	listFoosSchema,
} from "@acme/types/schemas/foo.schema";
import { protectedProcedure, router } from "..";

export const fooRouter = router({
	create: protectedProcedure
		.input(createFooSchema)
		.mutation(async ({ input, ctx }) => {
			await ctx.services.fooService.create(input, ctx.userId);
		}),
	list: protectedProcedure
		.input(listParamsSchema)
		.output(listFoosSchema)
		.query(async ({ input, ctx }) => {
			const { data, total } = await ctx.services.fooService.list(input);
			return {
				data,
				total,
				pageCount: Math.ceil(total / input.limit),
			};
		}),
});
