import { auth } from "@omnia/auth";
import { env } from "@omnia/env/server";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyPluginCallback } from "fastify";
import { servicesFactory } from "@/services-factory";

const ALLOWED_MIME_TYPES = new Set([
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/msword",
	"text/plain",
]);

const documentsRoutes: FastifyPluginCallback = (fastify, _opts, done) => {
	const services = servicesFactory(fastify.documentIngestionQueue);
	// POST /api/documents/upload
	fastify.post("/upload", async (request, reply) => {
		const session = await auth.api.getSession({
			headers: fromNodeHeaders(request.headers),
		});

		if (!session) {
			return reply.status(401).send({ error: "Unauthorized" });
		}

		const data = await request.file();

		if (!data) {
			return reply.status(400).send({ error: "No file uploaded" });
		}

		const mimeType = data.mimetype;

		if (!ALLOWED_MIME_TYPES.has(mimeType)) {
			return reply.status(400).send({
				error: "File type not allowed. Allowed: pdf, docx, doc, txt",
			});
		}

		const buffer = await data.toBuffer();
		const maxBytes = env.RAG_MAX_FILE_SIZE_MB * 1024 * 1024;

		if (buffer.length > maxBytes) {
			return reply.status(400).send({
				error: `File exceeds maximum size of ${env.RAG_MAX_FILE_SIZE_MB}MB`,
			});
		}

		const result = await services.documentService.upload(
			{
				filename: data.filename,
				mimeType,
				buffer,
				uploadDir: env.RAG_UPLOAD_DIR,
			},
			Number(session.user.id)
		);

		return reply.status(201).send(result);
	});

	// POST /api/documents/:id/version
	fastify.post<{ Params: { id: string } }>(
		"/:id/version",
		async (request, reply) => {
			const session = await auth.api.getSession({
				headers: fromNodeHeaders(request.headers),
			});

			if (!session) {
				return reply.status(401).send({ error: "Unauthorized" });
			}

			const documentId = Number(request.params.id);

			if (!Number.isInteger(documentId) || documentId <= 0) {
				return reply.status(400).send({ error: "Invalid document id" });
			}

			const data = await request.file();

			if (!data) {
				return reply.status(400).send({ error: "No file uploaded" });
			}

			const mimeType = data.mimetype;

			if (!ALLOWED_MIME_TYPES.has(mimeType)) {
				return reply.status(400).send({
					error: "File type not allowed. Allowed: pdf, docx, doc, txt",
				});
			}

			const buffer = await data.toBuffer();
			const maxBytes = env.RAG_MAX_FILE_SIZE_MB * 1024 * 1024;

			if (buffer.length > maxBytes) {
				return reply.status(400).send({
					error: `File exceeds maximum size of ${env.RAG_MAX_FILE_SIZE_MB}MB`,
				});
			}

			const result = await services.documentService.createNewVersion(
				documentId,
				{
					filename: data.filename,
					mimeType,
					buffer,
					uploadDir: env.RAG_UPLOAD_DIR,
				},
				Number(session.user.id)
			);

			return reply.status(201).send(result);
		}
	);

	done();
};

export default documentsRoutes;
