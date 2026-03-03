import type { Table } from "@tanstack/react-table";
import { Plus, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";

// import { DataTableViewOptions } from "./data-table-view-options"

export interface DataTableToolbarAction {
	icon?: ReactNode;
	label: string;
	onClick: () => void;
	variant?: React.ComponentProps<typeof Button>["variant"];
}

interface DataTableToolbarProps<TData> {
	actions?: DataTableToolbarAction[];
	children?: ReactNode; // For extra filters
	searchPlaceholder?: string;
	table: Table<TData>;
}

export function DataTableToolbar<TData>({
	table,
	searchPlaceholder = "Filtrar...",
	children,
	actions,
}: DataTableToolbarProps<TData>) {
	const isFiltered = table.getState().columnFilters.length > 0;
	const [inputValue, setInputValue] = useState(
		(table.getState().globalFilter as string) ?? ""
	);
	const debouncedFilter = useDebounce(inputValue, 300);

	useEffect(() => {
		table.setGlobalFilter(debouncedFilter);
	}, [debouncedFilter, table]);

	const resolvedActions: DataTableToolbarAction[] = actions ?? [
		{
			label: "Criar",
			// biome-ignore lint/suspicious/noEmptyBlockStatements: default placeholder
			onClick: () => {},
			icon: <Plus className="h-4 w-4" />,
		},
	];

	return (
		<div className="flex items-center justify-between gap-2">
			{/* Actions — left side */}
			<div className="flex items-center gap-2">
				{resolvedActions.map((action) => (
					<Button
						className="h-8"
						key={action.label}
						onClick={action.onClick}
						variant={action.variant ?? "default"}
					>
						{action.icon}
						{action.label}
					</Button>
				))}
			</div>

			{/* Filters — right side */}
			<div className="flex items-center gap-2">
				{children}
				<Input
					className="h-8 w-37.5 lg:w-62.5"
					onChange={(event) => setInputValue(event.target.value)}
					placeholder={searchPlaceholder}
					value={inputValue}
				/>
				{isFiltered && (
					<Button
						className="h-8 px-2 lg:px-3"
						onClick={() => table.resetColumnFilters()}
						variant="ghost"
					>
						Limpar
						<X className="ml-2 h-4 w-4" />
					</Button>
				)}
			</div>
		</div>
	);
}
