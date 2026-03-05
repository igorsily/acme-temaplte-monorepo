import pdfParse from "pdf-parse";

export const parsePdf = async (buffer: Buffer): Promise<string> => {
	const result = await pdfParse(buffer);
	return result.text;
};
