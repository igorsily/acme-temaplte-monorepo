import type * as React from "react";

import { cn } from "@/lib/utils";

interface LabelProps extends React.ComponentProps<"label"> {
	required?: boolean;
}

function Label({ className, required, ...props }: LabelProps) {
	return (
		<label
			className={cn(
				"flex select-none items-center gap-2 text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
				className
			)}
			data-slot="label"
			{...props}
		>
			{props.children}
			{required && <span className="text-red-500">*</span>}
		</label>
	);
}

export { Label };
