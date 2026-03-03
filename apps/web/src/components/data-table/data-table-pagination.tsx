import type { Table } from "@tanstack/react-table";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface DataTablePaginationProps<TData> {
	isLoading?: boolean;
	table: Table<TData>;
}

export function DataTablePagination<TData>({
	table,
	isLoading,
}: DataTablePaginationProps<TData>) {
	if (isLoading) {
		return (
			<div className="flex items-center justify-between px-2">
				<Skeleton className="h-8 w-[200px]" />
				<div className="flex items-center space-x-6 lg:space-x-8">
					<Skeleton className="h-8 w-[100px]" />
					<Skeleton className="h-8 w-[200px]" />
				</div>
			</div>
		);
	}
	return (
		<div className="flex items-center justify-between px-2">
			<div className="flex-1" />
			<div className="flex items-center space-x-6 lg:space-x-8">
				<div className="flex items-center space-x-2">
					<p className="font-medium text-sm">Linhas por página</p>
					<Select
						onValueChange={(value) => {
							table.setPageSize(Number(value));
						}}
						value={`${table.getState().pagination.pageSize}`}
					>
						<SelectTrigger className="h-8 w-[70px]">
							<SelectValue placeholder={table.getState().pagination.pageSize} />
						</SelectTrigger>
						<SelectContent side="top">
							{[10, 20, 30, 40, 50].map((pageSize) => (
								<SelectItem key={pageSize} value={`${pageSize}`}>
									{pageSize}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center justify-center whitespace-nowrap font-medium text-sm">
					Página {table.getState().pagination.pageIndex + 1} de{" "}
					{table.getPageCount()}
				</div>
				<div className="flex items-center space-x-2">
					<Button
						className="hidden h-8 w-8 p-0 lg:flex"
						disabled={!table.getCanPreviousPage()}
						onClick={() => table.setPageIndex(0)}
						variant="outline"
					>
						<span className="sr-only">Ir para primeira página</span>
						<ChevronsLeft className="h-4 w-4" />
					</Button>
					<Button
						className="h-8 w-8 p-0"
						disabled={!table.getCanPreviousPage()}
						onClick={() => table.previousPage()}
						variant="outline"
					>
						<span className="sr-only">Página anterior</span>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button
						className="h-8 w-8 p-0"
						disabled={!table.getCanNextPage()}
						onClick={() => table.nextPage()}
						variant="outline"
					>
						<span className="sr-only">Próxima página</span>
						<ChevronRight className="h-4 w-4" />
					</Button>
					<Button
						className="hidden h-8 w-8 p-0 lg:flex"
						disabled={!table.getCanNextPage()}
						onClick={() => table.setPageIndex(table.getPageCount() - 1)}
						variant="outline"
					>
						<span className="sr-only">Ir para última página</span>
						<ChevronsRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
