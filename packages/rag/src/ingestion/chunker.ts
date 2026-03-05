const CHUNK_SIZE = 512; // tokens aproximados (chars / 4)
const CHUNK_OVERLAP = 50;

export type Chunk = { content: string; chunkIndex: number };

export const chunkText = (text: string): Chunk[] => {
	const chunkSizeChars = CHUNK_SIZE * 4;
	const overlapChars = CHUNK_OVERLAP * 4;
	const chunks: Chunk[] = [];

	let start = 0;
	let index = 0;
	while (start < text.length) {
		const end = Math.min(start + chunkSizeChars, text.length);
		chunks.push({ content: text.slice(start, end), chunkIndex: index++ });
		start += chunkSizeChars - overlapChars;
	}
	return chunks;
};
