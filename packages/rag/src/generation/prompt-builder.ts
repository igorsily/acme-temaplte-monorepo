type Message = { role: "user" | "assistant"; content: string };

type Source = { documentName: string; excerpt: string };

type BuildPromptInput = {
	question: string;
	retrievedChunks: { content: string; documentName: string }[];
	conversationHistory: Message[];
	schemaContext?: string;
};

export type BuiltPrompt = {
	messages: { role: "system" | "user" | "assistant"; content: string }[];
	sources: Source[];
};

const SYSTEM_PROMPT = `Você é um assistente interno da empresa. Responda apenas com base
nas informações fornecidas no contexto. Se a informação não estiver no contexto,
diga que não encontrou a informação. Cite sempre a fonte do documento ao responder.
Quando usar dados do banco de dados, indique claramente que é uma consulta ao banco.`;

export const buildPrompt = (input: BuildPromptInput): BuiltPrompt => {
	const { question, retrievedChunks, conversationHistory, schemaContext } =
		input;

	const contextBlock = retrievedChunks
		.map((c, i) => `[Fonte ${i + 1} — ${c.documentName}]\n${c.content}`)
		.join("\n\n---\n\n");

	const userContent = [
		"### Contexto dos Documentos:",
		contextBlock,
		schemaContext ? `\n### Dados do Banco de Dados:\n${schemaContext}` : "",
		`\n### Pergunta:\n${question}`,
	]
		.filter(Boolean)
		.join("\n");

	return {
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			...conversationHistory,
			{ role: "user", content: userContent },
		],
		sources: retrievedChunks.map((c) => ({
			documentName: c.documentName,
			excerpt: c.content.slice(0, 200),
		})),
	};
};
