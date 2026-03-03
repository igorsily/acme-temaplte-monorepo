import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
	leftSection?: React.ReactNode;
	rightSection?: React.ReactNode;
}

function Input({
	className,
	type,
	leftSection,
	rightSection,
	...props
}: InputProps) {
	const inputRender = (
		<InputPrimitive
			className={cn(
				"flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
				"focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
				"aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
				leftSection && "pl-9",
				rightSection && "pr-9",
				className
			)}
			data-slot="input"
			type={type}
			{...props}
		/>
	);

	if (!(leftSection || rightSection)) {
		return inputRender;
	}

	return (
		<div className="relative flex w-full items-center">
			{leftSection && (
				<div className="absolute left-3 flex items-center justify-center text-muted-foreground">
					{leftSection}
				</div>
			)}
			{inputRender}
			{rightSection && (
				<div className="absolute right-3 flex items-center justify-center text-muted-foreground">
					{rightSection}
				</div>
			)}
		</div>
	);
}

export { Input };
