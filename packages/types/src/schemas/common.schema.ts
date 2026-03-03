import { z } from "zod";

export const listParamsSchema = z.object({
	page: z.number().int().positive().default(1),
	limit: z.number().int().positive().max(100).default(10),
	sort: z.string().optional(),
	search: z.string().optional(),
});

export const listResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
	z.object({
		data: itemSchema.array(),
		pageCount: z.number(),
		total: z.number(),
	});

export type ListParams = z.infer<typeof listParamsSchema>;
