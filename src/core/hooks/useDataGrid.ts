"use client";

import { useCallback, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export interface SortingRule {
  columnId: string;
  direction: SortDirection;
}

export type FilterOperator = "equals" | "contains" | "range" | "regex";

export interface ColumnFilterValue {
  operator: FilterOperator;
  value: string | number | [number, number];
}

export type ColumnFiltersState = Record<string, ColumnFilterValue>;

export interface ColumnDef<TData> {
  id: string;
  header: string;
  accessor: (row: TData) => string | number;
  sortable?: boolean;
  filterable?: boolean;
}

export interface UseDataGridOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  getRowId: (row: TData) => string;
}

export interface UseDataGridResult<TData> {
  columns: ColumnDef<TData>[];
  rows: TData[];
  rowCount: number;

  getRowId: (row: TData) => string;

  sortingState: SortingRule[];
  toggleSort: (columnId: string, additive?: boolean) => void;
  clearSorting: () => void;

  globalFilter: string;
  setGlobalFilter: (value: string) => void;
  columnFilters: ColumnFiltersState;
  setColumnFilter: (columnId: string, filter: ColumnFilterValue | null) => void;
  clearFilters: () => void;

  selectedRowIds: Set<string>;
  toggleRowSelection: (
    rowId: string,
    rowIndex: number,
    options?: { shiftKey?: boolean; metaOrCtrlKey?: boolean },
  ) => void;
  clearSelection: () => void;
  isRowSelected: (rowId: string) => boolean;

  columnVisibility: Record<string, boolean>;
  toggleColumnVisibility: (columnId: string) => void;
  visibleColumns: ColumnDef<TData>[];
}

function applyGlobalFilter<TData>(
  rows: TData[],
  columns: ColumnDef<TData>[],
  filterValue: string,
): TData[] {
  if (!filterValue.trim()) return rows;
  const needle = filterValue.trim().toLowerCase();
  const filterableColumns = columns.filter((col) => col.filterable !== false);
  return rows.filter((row) =>
    filterableColumns.some((col) =>
      String(col.accessor(row)).toLowerCase().includes(needle),
    ),
  );
}

function matchesColumnFilter(
  cellValue: string | number,
  filter: ColumnFilterValue,
): boolean {
  switch (filter.operator) {
    case "equals":
      return (
        String(cellValue).toLowerCase() === String(filter.value).toLowerCase()
      );
    case "contains":
      return String(cellValue)
        .toLowerCase()
        .includes(String(filter.value).toLowerCase());
    case "range": {
      if (!Array.isArray(filter.value)) return true;
      const [min, max] = filter.value;
      const numeric = Number(cellValue);
      return Number.isFinite(numeric) && numeric >= min && numeric <= max;
    }
    case "regex": {
      try {
        const pattern = new RegExp(String(filter.value), "i");
        return pattern.test(String(cellValue));
      } catch {
        return true; // invalid regex mid-typing shouldn't wipe the result set
      }
    }
    default:
      return true;
  }
}

function applyColumnFilters<TData>(
  rows: TData[],
  columns: ColumnDef<TData>[],
  filters: ColumnFiltersState,
): TData[] {
  const activeEntries = Object.entries(filters);
  if (activeEntries.length === 0) return rows;

  return rows.filter((row) =>
    activeEntries.every(([columnId, filter]) => {
      const column = columns.find((col) => col.id === columnId);
      if (!column) return true;
      return matchesColumnFilter(column.accessor(row), filter);
    }),
  );
}

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function applySorting<TData>(
  rows: TData[],
  columns: ColumnDef<TData>[],
  sortingState: SortingRule[],
): TData[] {
  if (sortingState.length === 0) return rows;

  const columnMap = new Map(columns.map((col) => [col.id, col]));
  // Copy first — never mutate the caller's source array.
  return [...rows].sort((rowA, rowB) => {
    for (const rule of sortingState) {
      const column = columnMap.get(rule.columnId);
      if (!column) continue;
      const result = compareValues(
        column.accessor(rowA),
        column.accessor(rowB),
      );
      if (result !== 0) return rule.direction === "asc" ? result : -result;
    }
    return 0;
  });
}

export function useDataGrid<TData>({
  data,
  columns,
  getRowId,
}: UseDataGridOptions<TData>): UseDataGridResult<TData> {
  const [sortingState, setSortingState] = useState<SortingRule[]>([]);
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>({});
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null,
  );
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({});

  const toggleSort = useCallback((columnId: string, additive = false) => {
    setSortingState((prev) => {
      const existing = prev.find((rule) => rule.columnId === columnId);
      const withoutColumn = prev.filter((rule) => rule.columnId !== columnId);

      let nextRule: SortingRule | null;
      if (!existing) {
        nextRule = { columnId, direction: "asc" };
      } else if (existing.direction === "asc") {
        nextRule = { columnId, direction: "desc" };
      } else {
        nextRule = null; // third click clears sort on this column
      }

      const base = additive ? withoutColumn : [];
      return nextRule ? [...base, nextRule] : base;
    });
  }, []);

  const clearSorting = useCallback(() => setSortingState([]), []);

  const setColumnFilter = useCallback(
    (columnId: string, filter: ColumnFilterValue | null) => {
      setColumnFilters((prev) => {
        const next = { ...prev };
        if (filter === null) delete next[columnId];
        else next[columnId] = filter;
        return next;
      });
    },
    [],
  );

  const clearFilters = useCallback(() => {
    setGlobalFilter("");
    setColumnFilters({});
  }, []);

  const processedRows = useMemo(() => {
    const afterGlobalFilter = applyGlobalFilter(data, columns, globalFilter);
    const afterColumnFilters = applyColumnFilters(
      afterGlobalFilter,
      columns,
      columnFilters,
    );
    return applySorting(afterColumnFilters, columns, sortingState);
  }, [data, columns, globalFilter, columnFilters, sortingState]);

  const toggleRowSelection = useCallback(
    (
      rowId: string,
      rowIndex: number,
      options?: { shiftKey?: boolean; metaOrCtrlKey?: boolean },
    ) => {
      setSelectedRowIds((prev) => {
        const next = new Set(prev);

        if (options?.shiftKey && lastSelectedIndex !== null) {
          const [start, end] =
            lastSelectedIndex < rowIndex
              ? [lastSelectedIndex, rowIndex]
              : [rowIndex, lastSelectedIndex];
          for (let i = start; i <= end; i += 1) {
            const row = processedRows[i];
            if (row) next.add(getRowId(row));
          }
          return next;
        }

        if (options?.metaOrCtrlKey) {
          if (next.has(rowId)) next.delete(rowId);
          else next.add(rowId);
          return next;
        }

        next.clear();
        next.add(rowId);
        return next;
      });
      setLastSelectedIndex(rowIndex);
    },
    [lastSelectedIndex, processedRows, getRowId],
  );

  const clearSelection = useCallback(() => {
    setSelectedRowIds(new Set());
    setLastSelectedIndex(null);
  }, []);

  const isRowSelected = useCallback(
    (rowId: string) => selectedRowIds.has(rowId),
    [selectedRowIds],
  );

  const toggleColumnVisibility = useCallback((columnId: string) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [columnId]: prev[columnId] === false ? true : false,
    }));
  }, []);

  const visibleColumns = useMemo(
    () => columns.filter((col) => columnVisibility[col.id] !== false),
    [columns, columnVisibility],
  );

  return {
    columns,
    rows: processedRows,
    rowCount: processedRows.length,
    sortingState,
    toggleSort,
    clearSorting,
    globalFilter,
    setGlobalFilter,
    columnFilters,
    setColumnFilter,
    clearFilters,
    selectedRowIds,
    toggleRowSelection,
    clearSelection,
    isRowSelected,
    columnVisibility,
    toggleColumnVisibility,
    visibleColumns,
    getRowId,
  };
}
