import { z } from "zod";
import { type listParamsSchema, listResponseSchema } from "./common.schema";

// 1. Schema de criação (input da API — dados enviados pelo cliente)
export const createFooSchema = z.object({
	name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
	value: z.string().optional(),
});

// 2. Schema de atualização (input da API — dados enviados pelo cliente)
export const updateFooSchema = z.object({
	id: z.number(),
	name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres").optional(),
	value: z.string().optional(),
});

// 3. Schema de resposta (output da API — dados retornados pelo servidor)
export const fooSchema = z.object({
	id: z.number(),
	name: z.string(),
	value: z.number().nullable(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

// 4. Schema de listagem (padrão para todos os domínios)
export const listFoosSchema = listResponseSchema(fooSchema);

// 5. Tipos TypeScript derivados dos schemas Zod
export type CreateFooInput = z.infer<typeof createFooSchema>;
export type UpdateFooInput = z.infer<typeof updateFooSchema>;
export type Foo = z.infer<typeof fooSchema>;
export type ListFoosInput = z.infer<typeof listParamsSchema>;
export type ListFoosOutput = z.infer<typeof listFoosSchema>;
