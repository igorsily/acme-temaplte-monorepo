import { parseDocx } from "./docx.parser";
import { parsePdf } from "./pdf.parser";
import { parseTxt } from "./txt.parser";

export const parseDocument = async (
	buffer: Buffer,
	mimeType: string
): Promise<string> => {
	switch (mimeType) {
		case "application/pdf":
			return parsePdf(buffer);
		case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
			return parseDocx(buffer);
		case "text/plain":
			return parseTxt(buffer);
		default:
			throw new Error(`Unsupported mime type: ${mimeType}`);
	}
};
