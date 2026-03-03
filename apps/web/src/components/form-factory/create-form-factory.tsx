import { useForm } from "@tanstack/react-form";
import type { ReactNode } from "react";
import type z from "zod";
import type { ZodRawShape } from "zod";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type {
	FormFactoryConfig,
	FormFieldProps,
	FormWrapperProps,
	SubmitProps,
	UseFormFactoryOptions,
} from "./form-factory.types";
import { FormFieldRenderer } from "./form-field";

// ---------------------------------------------------------------------------
// createFormFactory — a factory function principal
// ---------------------------------------------------------------------------

/**
 * Cria uma factory de formulário tipada baseada em um schema Zod.
 *
 * Retorna um objeto com `useForm` que, ao ser chamado dentro de um componente,
 * fornece primitivas tipadas (Form, Field, Submit) para composição livre.
 *
 * @example
 * ```tsx
 * const loginForm = createFormFactory({
 *   schema: z.object({
 *     email: z.email("Email inválido"),
 *     password: z.string().min(8, "Mínimo 8 chars"),
 *   }),
 *   defaultValues: { email: "", password: "" },
 * });
 *
 * function LoginPage() {
 *   const form = loginForm.useForm({
 *     onSubmit: async (values) => { ... },
 *   });
 *
 *   return (
 *     <form.Form>
 *       <form.Field name="email" label="Email" type="email" />
 *       <form.Field name="password" label="Senha" type="password" />
 *       <form.Submit>Entrar</form.Submit>
 *     </form.Form>
 *   );
 * }
 * ```
 */
export function createFormFactory<TShape extends ZodRawShape>(
	config: FormFactoryConfig<TShape>
) {
	type FormValues = z.input<typeof config.schema>;

	return {
		/**
		 * Hook que cria a instância do formulário e retorna componentes tipados.
		 * Deve ser chamado dentro de um componente React.
		 */
		useForm(options: UseFormFactoryOptions<TShape>) {
			const mergedDefaults = {
				...config.defaultValues,
				...options.defaultValues,
			} as FormValues;

			const form = useForm({
				defaultValues: mergedDefaults,
				validators: {
					onSubmit: config.schema,
				},
				onSubmit: async ({ value }) => {
					await options.onSubmit(value as z.output<typeof config.schema>);
				},
			});

			// -----------------------------------------------------------------------
			// Form — wrapper do <form> com handleSubmit
			// -----------------------------------------------------------------------
			function Form({ children, className }: FormWrapperProps) {
				return (
					<form
						className={cn(className)}
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
					>
						{children}
					</form>
				);
			}

			// -----------------------------------------------------------------------
			// Field — campo tipado com render automático ou customizado
			// -----------------------------------------------------------------------
			function Field({
				name,
				label,
				type = "text",
				placeholder,
				disabled,
				className,
				options,
				children,
				leftSection,
				rightSection,
			}: FormFieldProps<TShape>) {
				return (
					<form.Field name={name}>
						{(field) => {
							// Render customizado via children function
							if (typeof children === "function") {
								return children(field) as ReactNode;
							}

							// Render automático
							return (
								<FormFieldRenderer
									className={className}
									disabled={disabled}
									field={field}
									label={label}
									leftSection={leftSection}
									options={options}
									placeholder={placeholder}
									rightSection={rightSection}
									type={type}
								/>
							);
						}}
					</form.Field>
				);
			}

			// -----------------------------------------------------------------------
			// Submit — botão com estado automático
			// -----------------------------------------------------------------------
			function Submit({ children, className }: SubmitProps) {
				return (
					<form.Subscribe>
						{(state) => {
							const content =
								typeof children === "function"
									? children({
											isSubmitting: state.isSubmitting,
											canSubmit: state.canSubmit,
										})
									: children;

							return (
								<Button
									className={cn("w-full", className)}
									disabled={!state.canSubmit || state.isSubmitting}
									type="submit"
								>
									{content}
								</Button>
							);
						}}
					</form.Subscribe>
				);
			}

			return {
				Form,
				Field,
				Submit,
				/** Instância raw do TanStack Form para acesso programático */
				instance: form,
			};
		},
	};
}
