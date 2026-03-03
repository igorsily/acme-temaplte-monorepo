import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { FormFieldRendererProps } from "./form-factory.types";
import { FieldInfo } from "./form-field-info";

/**
 * Renderiza o componente de input correto baseado no type.
 */
function FieldInput({
	field,
	type = "text",
	placeholder,
	disabled,
	label,
	options,
	leftSection,
	rightSection,
}: Pick<
	FormFieldRendererProps,
	| "field"
	| "type"
	| "placeholder"
	| "disabled"
	| "label"
	| "options"
	| "leftSection"
	| "rightSection"
>) {
	if (type === "checkbox") {
		return (
			<div className="flex items-center gap-2">
				<Checkbox
					checked={field.state.value as boolean}
					disabled={disabled}
					id={field.name}
					onCheckedChange={(checked: boolean) => {
						field.handleChange(checked);
					}}
				/>
				{label && <Label htmlFor={field.name}>{label}</Label>}
			</div>
		);
	}

	if (type === "textarea") {
		return (
			<Textarea
				disabled={disabled}
				id={field.name}
				name={field.name}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				placeholder={placeholder}
				value={(field.state.value as string) ?? ""}
			/>
		);
	}

	if (type === "select") {
		return (
			<Select
				disabled={disabled}
				items={options}
				onValueChange={(value) => field.handleChange(value)}
				value={(field.state.value as string) ?? ""}
			>
				<SelectTrigger
					className="w-full"
					id={field.name}
					onBlur={field.handleBlur}
				>
					<SelectValue placeholder={placeholder ?? "Selecione..."} />
				</SelectTrigger>

				<SelectContent>
					{options?.map((opt) => (
						<SelectItem key={opt.value} label={opt.label} value={opt.value}>
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}

	return (
		<Input
			disabled={disabled}
			id={field.name}
			leftSection={leftSection}
			name={field.name}
			onBlur={field.handleBlur}
			onChange={(e) => {
				const raw = e.target.value;
				if (type === "number") {
					field.handleChange(raw === "" ? undefined : Number(raw));
				} else {
					field.handleChange(raw);
				}
			}}
			placeholder={placeholder}
			rightSection={rightSection}
			type={type}
			value={(field.state.value as string | number | undefined) ?? ""}
		/>
	);
}

/**
 * Renderiza um campo de formulário com Label, Input correto e mensagens de erro.
 * Usado internamente pelo FormFactory quando não há render customizado.
 */
export function FormFieldRenderer({
	field,
	label,
	type = "text",
	placeholder,
	disabled,
	className,
	options,
	leftSection,
	rightSection,
}: FormFieldRendererProps) {
	return (
		<div className={cn("space-y-2", className)}>
			{label && type !== "checkbox" && (
				<Label htmlFor={field.name}>{label}</Label>
			)}

			<FieldInput
				disabled={disabled}
				field={field}
				label={label}
				leftSection={leftSection}
				options={options}
				placeholder={placeholder}
				rightSection={rightSection}
				type={type}
			/>

			<FieldInfo field={field} />
		</div>
	);
}
