import { loginSchema } from "@omnia/types";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, KeyRound, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createFormFactory } from "@/components/form-factory";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

const loginForm = createFormFactory({
	schema: loginSchema,
	defaultValues: {
		username: "",
		password: "",
	},
});

export function SignInForm() {
	const navigate = useNavigate();

	const [showPassword, setShowPassword] = useState(false);

	const form = loginForm.useForm({
		onSubmit: async (value) => {
			await authClient.signIn.username(value, {
				onSuccess: () => {
					toast.success("Login realizado com sucesso!");
					navigate({ to: "/" });
				},
				onError: (ctx) => {
					if (ctx.error.code === "INVALID_USERNAME_OR_PASSWORD") {
						toast.error("Usuário ou senha inválidos");
						return;
					}

					toast.error(ctx.error.message || "Erro ao realizar login");
				},
			});
		},
	});

	return (
		<Card className="mx-auto my-auto w-full max-w-lg">
			<CardContent>
				<div className="mx-auto mt-10 w-full max-w-md p-6">
					<div className="mb-10 flex flex-col items-center gap-2">
						<h1 className="text-center font-bold text-3xl">
							Bem-vindo de volta
						</h1>
						<p className="mt-2">Entre na sua conta para continuar</p>
					</div>

					<form.Form className="space-y-4">
						<div>
							<form.Field
								label="Usuário"
								leftSection={<User className="h-4 w-4" />}
								name="username"
								type="text"
							/>
						</div>

						<div>
							<form.Field
								label="Senha"
								leftSection={<KeyRound className="h-4 w-4" />}
								name="password"
								rightSection={
									showPassword ? (
										<Eye
											className="h-4 w-4"
											onClick={() => setShowPassword(false)}
										/>
									) : (
										<EyeOff
											className="h-4 w-4"
											onClick={() => setShowPassword(true)}
										/>
									)
								}
								type={showPassword ? "text" : "password"}
							/>
						</div>

						<div>
							<form.Submit className="w-full rounded py-2 text-white transition hover:bg-primary/80">
								Entrar
							</form.Submit>
						</div>
					</form.Form>
				</div>
			</CardContent>
		</Card>
	);
}
