import { z } from "zod";

export const loginSchema = z.object({
	username: z
		.string()
		.min(1, "Nome de usuário é obrigatório")
		.regex(
			/^[a-zA-Z0-9_]+$/,
			"O nome de usuário só pode conter letras, números e underscores"
		),
	password: z.string().min(8, "A senha deve conter pelo menos 8 caracteres"),
});
