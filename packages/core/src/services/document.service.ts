import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ListParams } from "@omnia/types/schemas/common.schema";
import type {
	DocumentVersion,
	DocumentWithVersion,
	UploadDocumentOutput,
} from "@omnia/types/schemas/document.schema";
import type {
	CreateDocumentVersionInput,
	DocumentRepository,
} from "../repositories/document.repository";

export type UploadFileInput = {
	filename: string;
	mimeType: string;
	buffer: Buffer;
	uploadDir: string;
};

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
			version: 1,
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
		const input: CreateDocumentVersionInput = {
			documentId,
			version: 0, // repository will compute MAX + 1
			filePath: "",
			fileSize: file.buffer.length,
			userId,
		};

		// Create version record first to get the auto-incremented version number
		const version = await this.documentRepository.createVersion(input);
		const filePath = await this.saveFile(file, documentId, version.version);

		// Update the file path now that we have the version id
		await this.documentRepository.updateVersionStatus(version.id, "pending");

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
			status: "pending",
		};
	}

	async list(
		params: ListParams,
		userId: number
	): Promise<{ data: DocumentWithVersion[]; total: number }> {
		return this.documentRepository.listDocuments(params, userId);
	}

	async getVersionHistory(documentId: number): Promise<DocumentVersion[]> {
		return this.documentRepository.getVersionHistory(documentId);
	}

	async remove(documentId: number): Promise<void> {
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
