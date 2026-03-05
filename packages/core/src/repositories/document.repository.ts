import type { ListParams } from "@omnia/types/schemas/common.schema";
import type {
	Document,
	DocumentStatus,
	DocumentVersion,
	DocumentWithVersion,
} from "@omnia/types/schemas/document.schema";

export type CreateDocumentInput = {
	name: string;
	mimeType: string;
};

export type CreateDocumentVersionInput = {
	documentId: number;
	version: number;
	filePath: string;
	fileSize: number;
	userId: number;
};

export interface DocumentRepository {
	create(input: CreateDocumentInput, userId: number): Promise<Document>;
	createVersion(input: CreateDocumentVersionInput): Promise<DocumentVersion>;
	deactivateVersions(documentId: number): Promise<void>;
	getActiveVersion(documentId: number): Promise<DocumentVersion | null>;
	getVersionHistory(documentId: number): Promise<DocumentVersion[]>;
	listDocuments(
		params: ListParams,
		userId: number
	): Promise<{ data: DocumentWithVersion[]; total: number }>;
	softDeleteDocument(documentId: number): Promise<void>;
	updateVersionStatus(
		versionId: number,
		status: DocumentStatus,
		errorMessage?: string
	): Promise<void>;
}
