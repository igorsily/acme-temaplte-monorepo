import { z } from "zod";
import { listResponseSchema } from "./common.schema";

export const documentStatusSchema = z.enum([
	"pending",
	"processing",
	"active",
	"error",
]);

export const documentSchema = z.object({
	id: z.number(),
	name: z.string(),
	mimeType: z.string(),
	deletedAt: z.date().nullable(),
	userId: z.number(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const documentVersionSchema = z.object({
	id: z.number(),
	documentId: z.number(),
	version: z.number(),
	filePath: z.string(),
	fileSize: z.number(),
	status: documentStatusSchema,
	isActive: z.boolean(),
	errorMessage: z.string().nullable(),
	userId: z.number(),
	createdAt: z.date(),
	updatedAt: z.date(),
});

export const documentWithVersionSchema = documentSchema.extend({
	activeVersion: documentVersionSchema.nullable(),
});

export const listDocumentsSchema = listResponseSchema(
	documentWithVersionSchema
);

export const uploadDocumentOutputSchema = z.object({
	documentId: z.number(),
	versionId: z.number(),
	version: z.number(),
	status: documentStatusSchema,
});

export type DocumentStatus = z.infer<typeof documentStatusSchema>;
export type Document = z.infer<typeof documentSchema>;
export type DocumentVersion = z.infer<typeof documentVersionSchema>;
export type DocumentWithVersion = z.infer<typeof documentWithVersionSchema>;
export type ListDocumentsOutput = z.infer<typeof listDocumentsSchema>;
export type UploadDocumentOutput = z.infer<typeof uploadDocumentOutputSchema>;
