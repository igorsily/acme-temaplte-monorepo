import { env } from "@omnia/env/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
const MODEL = "text-embedding-3-small";

export const embedTexts = async (texts: string[]): Promise<number[][]> => {
	const response = await openai.embeddings.create({
		model: MODEL,
		input: texts,
	});
	return response.data.map((d) => d.embedding);
};

export const embedText = async (text: string): Promise<number[]> => {
	const [embedding] = await embedTexts([text]);
	if (!embedding) {
		throw new Error("No embedding returned from OpenAI");
	}
	return embedding;
};
