import {
	type ColumnDef,
	type ColumnFiltersState,
	getCoreRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type RowData,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useMemo, useState } from "react";

export const tableQueryParsers = {
	page: parseAsInteger.withDefault(1),
	limit: parseAsInteger.withDefault(10),
	sort: parseAsString.withDefault("created_at"),
	search: parseAsString.withDefault(""),
};

declare module "@tanstack/react-table" {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface TableMeta<TData extends RowData> {
		isEmpty: boolean;
		isError: boolean;
		isLoading: boolean;
	}
}

export interface QueryState<TData> {
	data: TData[] | undefined;
	error: unknown;
	isError: boolean;
	isFetching?: boolean;
	isLoading: boolean;
}

interface UseDataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	pageCount?: number;
	query: QueryState<TData>;
}

export function useDataTable<TData, TValue>({
	columns,
	query,
	pageCount = -1,
}: UseDataTableProps<TData, TValue>) {
	const data = query.data ?? [];
	const [urlState, setUrlState] = useQueryStates(tableQueryParsers);

	const pagination: PaginationState = useMemo(
		() => ({
			pageIndex: urlState.page - 1,
			pageSize: urlState.limit,
		}),
		[urlState.page, urlState.limit]
	);

	const sorting: SortingState = useMemo(() => {
		const [id, dir] = urlState.sort.split(".");
		if (!id) {
			return [];
		}
		return [{ id, desc: dir === "desc" }];
	}, [urlState.sort]);

	const [rowSelection, setRowSelection] = useState({});
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

	const onPaginationChange = (
		updaterOrValue:
			| PaginationState
			| ((old: PaginationState) => PaginationState)
	) => {
		const next =
			typeof updaterOrValue === "function"
				? updaterOrValue(pagination)
				: updaterOrValue;

		setUrlState((prev) => ({
			...prev,
			page: next.pageIndex + 1,
			limit: next.pageSize,
		}));
	};

	const onSortingChange = (
		updaterOrValue: SortingState | ((old: SortingState) => SortingState)
	) => {
		const next =
			typeof updaterOrValue === "function"
				? updaterOrValue(sorting)
				: updaterOrValue;

		const firstSort = next[0];
		const sortString = firstSort
			? `${firstSort.id}.${firstSort.desc ? "desc" : "asc"}`
			: "";

		setUrlState((prev) => ({ ...prev, sort: sortString, page: 1 }));
	};

	const onGlobalFilterChange = (term: string) => {
		setUrlState((prev) => ({ ...prev, search: term || null, page: 1 }));
	};

	const isLoading = query.isLoading;
	const isEmpty = !(query.isLoading || query.isError) && data.length === 0;
	const isError = query.isError;

	const table = useReactTable({
		data,
		columns,
		pageCount,
		meta: { isLoading, isEmpty, isError },
		state: {
			pagination,
			sorting,
			rowSelection,
			columnVisibility,
			columnFilters,
			globalFilter: urlState.search,
		},
		enableRowSelection: true,
		onRowSelectionChange: setRowSelection,
		onPaginationChange,
		onSortingChange,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onGlobalFilterChange: (updater) => {
			const value =
				typeof updater === "function" ? updater(urlState.search) : updater;
			onGlobalFilterChange(String(value));
		},
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
		manualPagination: true,
		manualSorting: true,
		manualFiltering: true,
	});

	return {
		table,
		isFetching: query.isFetching ?? false,
		error: query.error,
	};
}
