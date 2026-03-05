import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ListParams } from "@omnia/types/schemas/common.schema";
import type {
	DocumentVersion,
	DocumentWithVersion,
	UploadDocumentOutput,
} from "@omnia/types/schemas/document.schema";
import type { DocumentRepository } from "../repositories/document.repository";

export interface UploadFileInput {
	buffer: Buffer;
	filename: string;
	mimeType: string;
	uploadDir: string;
}

export interface DocumentIngestionQueue {
	add(
		name: string,
		data: {
			documentVersionId: number;
			filePath: string;
			mimeType: string;
			documentId: number;
		}
	): Promise<unknown>;
}

export class DocumentService {
	private readonly documentRepository: DocumentRepository;
	private readonly ingestionQueue: DocumentIngestionQueue;

	constructor(
		documentRepository: DocumentRepository,
		ingestionQueue: DocumentIngestionQueue
	) {
		this.documentRepository = documentRepository;
		this.ingestionQueue = ingestionQueue;
	}

	async upload(
		file: UploadFileInput,
		userId: number
	): Promise<UploadDocumentOutput> {
		const doc = await this.documentRepository.create(
			{ name: file.filename, mimeType: file.mimeType },
			userId
		);

		const filePath = await this.saveFile(file, doc.id, 1);

		const version = await this.documentRepository.createVersion({
			documentId: doc.id,
			filePath,
			fileSize: file.buffer.length,
			userId,
		});

		await this.ingestionQueue.add("ingest", {
			documentVersionId: version.id,
			filePath,
			mimeType: file.mimeType,
			documentId: doc.id,
		});

		return {
			documentId: doc.id,
			versionId: version.id,
			version: version.version,
			status: version.status,
		};
	}

	async createNewVersion(
		documentId: number,
		file: UploadFileInput,
		userId: number
	): Promise<UploadDocumentOutput> {
		// Create version record with empty filePath to get the auto-incremented version number
		const version = await this.documentRepository.createVersion({
			documentId,
			filePath: "",
			fileSize: file.buffer.length,
			userId,
		});

		const filePath = await this.saveFile(file, documentId, version.version);

		// Persist the actual file path now that we have the version number
		await this.documentRepository.updateVersionFilePath(version.id, filePath);

		await this.ingestionQueue.add("ingest", {
			documentVersionId: version.id,
			filePath,
			mimeType: file.mimeType,
			documentId,
		});

		return {
			documentId,
			versionId: version.id,
			version: version.version,
			status: version.status,
		};
	}

	list(
		params: ListParams,
		userId: number
	): Promise<{ data: DocumentWithVersion[]; total: number }> {
		return this.documentRepository.listDocuments(params, userId);
	}

	getVersionHistory(documentId: number): Promise<DocumentVersion[]> {
		return this.documentRepository.getVersionHistory(documentId);
	}

	remove(documentId: number): Promise<void> {
		return this.documentRepository.softDeleteDocument(documentId);
	}

	private async saveFile(
		file: UploadFileInput,
		documentId: number,
		version: number
	): Promise<string> {
		const dir = join(file.uploadDir, String(documentId));
		await mkdir(dir, { recursive: true });
		const ext = file.filename.split(".").pop() ?? "bin";
		const filePath = join(dir, `v${version}.${ext}`);
		await writeFile(filePath, file.buffer);
		return filePath;
	}
}

export type DocumentServiceType = InstanceType<typeof DocumentService>;
