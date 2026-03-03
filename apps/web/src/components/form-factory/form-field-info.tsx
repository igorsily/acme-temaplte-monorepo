import type { AnyFieldApi } from "@tanstack/react-form";

export function FieldInfo({ field }: { field: AnyFieldApi }) {
	return (
		<>
			{field.state.meta.isTouched && !field.state.meta.isValid
				? field.state.meta.errors.map((error) => (
						<p className="text-red-500" key={error?.message}>
							{error?.message}
						</p>
					))
				: null}
		</>
	);
}
