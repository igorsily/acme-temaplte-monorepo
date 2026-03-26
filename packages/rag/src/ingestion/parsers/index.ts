import { parseDocx } from "./docx.parser";
import { parsePdf } from "./pdf.parser";
import { parseTxt } from "./txt.parser";

export const parseDocument = (
	buffer: Buffer,
	mimeType: string
): Promise<string> => {
	switch (mimeType) {
		case "application/pdf":
			return parsePdf(buffer);
		case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
			return parseDocx(buffer);
		case "text/plain":
			return Promise.resolve(parseTxt(buffer));
		default:
			throw new Error(`Unsupported mime type: ${mimeType}`);
	}
};
