import { flexRender, type Table as TanStackTable } from "@tanstack/react-table";
import type * as React from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";

function DataTableRoot({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return <div className={cn("space-y-4", className)}>{children}</div>;
}

function TableBodyContent<TData>({
	table,
	colSpan,
	isLoading,
	isEmpty,
	isError,
}: {
	table: TanStackTable<TData>;
	colSpan: number;
	isLoading: boolean;
	isEmpty: boolean;
	isError: boolean;
}) {
	if (isLoading) {
		return (
			<TableRow>
				<TableCell className="h-24 text-center" colSpan={colSpan}>
					Carregando...
				</TableCell>
			</TableRow>
		);
	}

	if (isError) {
		return (
			<TableRow>
				<TableCell className="h-24 text-center" colSpan={colSpan}>
					Erro ao carregar os dados.
				</TableCell>
			</TableRow>
		);
	}

	if (isEmpty) {
		return (
			<TableRow>
				<TableCell className="h-24 text-center" colSpan={colSpan}>
					Nenhum resultado encontrado.
				</TableCell>
			</TableRow>
		);
	}

	return table.getRowModel().rows.map((row) => (
		<TableRow data-state={row.getIsSelected() && "selected"} key={row.id}>
			{row.getVisibleCells().map((cell) => (
				<TableCell key={cell.id}>
					{flexRender(cell.column.columnDef.cell, cell.getContext())}
				</TableCell>
			))}
		</TableRow>
	));
}

function DataTableContent<TData>({ table }: { table: TanStackTable<TData> }) {
	const { isLoading, isEmpty, isError } = table.options.meta ?? {
		isLoading: false,
		isEmpty: false,
		isError: false,
	};
	const colSpan = table.getAllColumns().length;

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead colSpan={header.colSpan} key={header.id}>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext()
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					<TableBodyContent
						colSpan={colSpan}
						isEmpty={isEmpty ?? false}
						isError={isError ?? false}
						isLoading={isLoading ?? false}
						table={table}
					/>
				</TableBody>
			</Table>
		</div>
	);
}

export const DataTable = Object.assign(DataTableRoot, {
	Toolbar: DataTableToolbar,
	Content: DataTableContent,
	Pagination: DataTablePagination,
});
