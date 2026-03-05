import { listParamsSchema } from "@omnia/types";
import { listDocumentsSchema } from "@omnia/types/schemas/document.schema";
import { z } from "zod";
import { protectedProcedure, router } from "..";

export const documentsRouter = router({
	list: protectedProcedure
		.input(listParamsSchema)
		.output(listDocumentsSchema)
		.query(async ({ input, ctx }) => {
			const { data, total } = await ctx.services.documentService.list(
				input,
				ctx.userId
			);
			return {
				data,
				total,
				pageCount: Math.ceil(total / input.limit),
			};
		}),

	getVersionHistory: protectedProcedure
		.input(z.object({ documentId: z.number().int().positive() }))
		.query(({ input, ctx }) => {
			return ctx.services.documentService.getVersionHistory(input.documentId);
		}),

	remove: protectedProcedure
		.input(z.object({ documentId: z.number().int().positive() }))
		.mutation(async ({ input, ctx }) => {
			await ctx.services.documentService.remove(input.documentId);
		}),
});
