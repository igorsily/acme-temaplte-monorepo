import type { ReactNode } from "react";
import type z from "zod";
import type { ZodObject, ZodRawShape } from "zod";

// ---------------------------------------------------------------------------
// Tipos de campo suportados pelo FormFactory
// ---------------------------------------------------------------------------
export type FieldType =
	| "text"
	| "email"
	| "password"
	| "number"
	| "textarea"
	| "select"
	| "checkbox";

// ---------------------------------------------------------------------------
// Opção de select
// ---------------------------------------------------------------------------
export interface SelectOption {
	label: string;
	value: string;
}

// ---------------------------------------------------------------------------
// Config passada para createFormFactory
// ---------------------------------------------------------------------------
export interface FormFactoryConfig<TShape extends ZodRawShape> {
	defaultValues: z.input<ZodObject<TShape>>;
	schema: ZodObject<TShape>;
}

// ---------------------------------------------------------------------------
// Options passadas no useForm do factory
// ---------------------------------------------------------------------------
export interface UseFormFactoryOptions<TShape extends ZodRawShape> {
	defaultValues?: Partial<z.input<ZodObject<TShape>>>;
	onSubmit: (values: z.output<ZodObject<TShape>>) => Promise<void> | void;
}

// ---------------------------------------------------------------------------
// Props do Field — name é tipado pelas keys do schema
// ---------------------------------------------------------------------------
export interface FormFieldProps<TShape extends ZodRawShape> {
	// biome-ignore lint/suspicious/noExplicitAny: FieldApi do TanStack Form possui 23+ type params — impraticável tipar inline
	children?: (field: any) => ReactNode;
	className?: string;
	disabled?: boolean;
	label?: string;
	leftSection?: ReactNode;
	name: keyof z.input<ZodObject<TShape>> & string;
	options?: SelectOption[];
	placeholder?: string;
	rightSection?: ReactNode;
	type?: FieldType;
}

// ---------------------------------------------------------------------------
// Props internas do componente de renderização de campo
// ---------------------------------------------------------------------------
export interface FormFieldRendererProps {
	className?: string;
	disabled?: boolean;
	// biome-ignore lint/suspicious/noExplicitAny: FieldApi do TanStack Form possui 23+ type params
	field: any;
	label?: string;
	leftSection?: ReactNode;
	options?: SelectOption[];
	placeholder?: string;
	rightSection?: ReactNode;
	type?: FieldType;
}

// ---------------------------------------------------------------------------
// Props do Submit
// ---------------------------------------------------------------------------
export interface SubmitProps {
	children?:
		| ReactNode
		| ((state: { isSubmitting: boolean; canSubmit: boolean }) => ReactNode);
	className?: string;
}

// ---------------------------------------------------------------------------
// Props do Form wrapper
// ---------------------------------------------------------------------------
export interface FormWrapperProps {
	children: ReactNode;
	className?: string;
}
