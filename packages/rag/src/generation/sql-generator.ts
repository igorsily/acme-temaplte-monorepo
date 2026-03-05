import { env } from "@omnia/env/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const SQL_SYSTEM_PROMPT = `Você é um gerador de SQL. Com base no schema fornecido,
gere APENAS uma query SELECT válida para PostgreSQL.
NUNCA gere INSERT, UPDATE, DELETE, DROP, CREATE, ALTER ou qualquer operação de escrita.
Retorne APENAS o SQL, sem explicações, sem markdown, sem código fenced.`;

const FORBIDDEN_PATTERNS =
	/\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE)\b/i;

const validateSelectOnly = (sqlQuery: string): string => {
	if (FORBIDDEN_PATTERNS.test(sqlQuery)) {
		throw new Error(`SQL gerado contém operação não permitida: ${sqlQuery}`);
	}
	if (!sqlQuery.trim().toUpperCase().startsWith("SELECT")) {
		throw new Error(`SQL gerado não é um SELECT: ${sqlQuery}`);
	}
	return sqlQuery;
};

export const generateSql = async (
	question: string,
	schemaContext: string
): Promise<string> => {
	const response = await openai.chat.completions.create({
		model: "gpt-4o",
		messages: [
			{ role: "system", content: SQL_SYSTEM_PROMPT },
			{
				role: "user",
				content: `Schema:\n${schemaContext}\n\nPergunta: ${question}`,
			},
		],
		temperature: 0,
		max_tokens: 500,
	});

	const sqlQuery = response.choices[0]?.message?.content?.trim() ?? "";
	return validateSelectOnly(sqlQuery);
};
