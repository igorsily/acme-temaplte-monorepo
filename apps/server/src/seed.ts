import { auth } from "@omnia/auth";

interface SeedUser {
	displayUsername: string;
	email: string;
	image?: string;
	name: string;
	password: string;
	username: string;
}

const SEED_USERS: SeedUser[] = [
	{
		name: "Omnia Inc",
		email: "omnia@omnia.com",
		password: "omnia@omnia",
		username: "omnia",
		displayUsername: "Omnia Inc",
	},
];

async function seed() {
	console.log("🌱 Iniciando seed de usuários...\n");

	for (const user of SEED_USERS) {
		try {
			await auth.api.signUpEmail({
				body: {
					name: user.name,
					email: user.email,
					password: user.password,
					username: user.username,
					displayUsername: user.displayUsername,
					image: user.image,
				},
			});

			console.log(`✅ Usuário criado: ${user.username}`);
		} catch (error) {
			const err = error as { body?: { code?: string }; status?: number };

			if (err.body?.code === "USER_ALREADY_EXISTS" || err.status === 422) {
				console.log(`⚠️  Usuário já existe (ignorado): ${user.username}`);
			} else {
				console.error(`❌ Erro ao criar usuário ${user.username}:`, error);
				throw error;
			}
		}
	}

	console.log("\n✅ Seed concluído com sucesso!");
	process.exit(0);
}

seed().catch((error) => {
	console.error("\n❌ Seed falhou:", error);
	process.exit(1);
});
