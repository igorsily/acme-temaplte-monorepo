import type {
	CreateDocumentInput,
	CreateDocumentVersionInput,
	DocumentRepository,
} from "@omnia/core/repositories/document.repository";
import type { ListParams } from "@omnia/types/schemas/common.schema";
import {
	type Document,
	type DocumentStatus,
	type DocumentVersion,
	type DocumentWithVersion,
	documentSchema,
	documentVersionSchema,
} from "@omnia/types/schemas/document.schema";
import { and, count, desc, eq, inArray, isNull, max } from "drizzle-orm";
import type { db } from "..";
import { documents, documentVersions } from "../schema/documents";

export class DrizzleDocumentRepository implements DocumentRepository {
	private readonly db: typeof db;

	constructor(dbInstance: typeof db) {
		this.db = dbInstance;
	}

	async create(input: CreateDocumentInput, userId: number): Promise<Document> {
		const [row] = await this.db
			.insert(documents)
			.values({ name: input.name, mimeType: input.mimeType, userId })
			.returning();
		if (!row) {
			throw new Error("Failed to create document");
		}
		return documentSchema.parse(row);
	}

	async createVersion(
		input: CreateDocumentVersionInput
	): Promise<DocumentVersion> {
		const row = await this.db.transaction(async (tx) => {
			// FOR UPDATE locks the aggregate row preventing concurrent version bumps
			const [maxRow] = await tx
				.select({ max: max(documentVersions.version) })
				.from(documentVersions)
				.where(eq(documentVersions.documentId, input.documentId))
				.for("update");

			const nextVersion = (maxRow?.max ?? 0) + 1;

			const [inserted] = await tx
				.insert(documentVersions)
				.values({
					documentId: input.documentId,
					version: nextVersion,
					filePath: input.filePath,
					fileSize: input.fileSize,
					userId: input.userId,
					status: "pending",
					isActive: false,
				})
				.returning();

			return inserted;
		});

		if (!row) {
			throw new Error("Failed to create document version");
		}
		return documentVersionSchema.parse(row);
	}

	async updateVersionFilePath(
		versionId: number,
		filePath: string
	): Promise<void> {
		await this.db
			.update(documentVersions)
			.set({ filePath })
			.where(eq(documentVersions.id, versionId));
	}

	async getActiveVersion(documentId: number): Promise<DocumentVersion | null> {
		const [row] = await this.db
			.select()
			.from(documentVersions)
			.where(
				and(
					eq(documentVersions.documentId, documentId),
					eq(documentVersions.isActive, true)
				)
			)
			.limit(1);
		return row ? documentVersionSchema.parse(row) : null;
	}

	async deactivateVersions(documentId: number): Promise<void> {
		await this.db
			.update(documentVersions)
			.set({ isActive: false })
			.where(eq(documentVersions.documentId, documentId));
	}

	async updateVersionStatus(
		versionId: number,
		status: DocumentStatus,
		errorMessage?: string
	): Promise<void> {
		await this.db
			.update(documentVersions)
			.set({ status, errorMessage: errorMessage ?? null })
			.where(eq(documentVersions.id, versionId));
	}

	async listDocuments(
		params: ListParams,
		userId: number
	): Promise<{ data: DocumentWithVersion[]; total: number }> {
		const { page, limit } = params;
		const offset = (page - 1) * limit;

		const [docRows, [totalCount]] = await Promise.all([
			this.db
				.select()
				.from(documents)
				.where(and(eq(documents.userId, userId), isNull(documents.deletedAt)))
				.orderBy(desc(documents.createdAt))
				.limit(limit)
				.offset(offset),
			this.db
				.select({ count: count() })
				.from(documents)
				.where(and(eq(documents.userId, userId), isNull(documents.deletedAt))),
		]);

		if (docRows.length === 0) {
			return { data: [], total: 0 };
		}

		const docIds = docRows.map((d) => d.id);

		// Fetch active versions for all documents in one query using inArray
		const activeVersionRows = await this.db
			.select()
			.from(documentVersions)
			.where(
				and(
					eq(documentVersions.isActive, true),
					inArray(documentVersions.documentId, docIds)
				)
			);

		const activeVersionMap = new Map<number, DocumentVersion>();
		for (const row of activeVersionRows) {
			activeVersionMap.set(row.documentId, documentVersionSchema.parse(row));
		}

		const data: DocumentWithVersion[] = docRows.map((doc) => ({
			...documentSchema.parse(doc),
			activeVersion: activeVersionMap.get(doc.id) ?? null,
		}));

		return { data, total: Number(totalCount?.count ?? 0) };
	}

	async getVersionHistory(documentId: number): Promise<DocumentVersion[]> {
		const rows = await this.db
			.select()
			.from(documentVersions)
			.where(eq(documentVersions.documentId, documentId))
			.orderBy(desc(documentVersions.version));
		return rows.map((row) => documentVersionSchema.parse(row));
	}

	async softDeleteDocument(documentId: number): Promise<void> {
		await this.db
			.update(documents)
			.set({ deletedAt: new Date() })
			.where(eq(documents.id, documentId));
	}
}
