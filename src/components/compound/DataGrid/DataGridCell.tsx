"use client";

import type { ColumnDef } from "@/core/hooks/useDataGrid";
import { cellKey, useDataGridContext } from "./DataGrid";

export interface DataGridCellProps<TData> {
  column: ColumnDef<TData>;
  row: TData;
  rowIndex: number;
  colIndex: number;
}

export function DataGridCell<TData>({
  column,
  row,
  rowIndex,
  colIndex,
}: DataGridCellProps<TData>) {
  const { activeCell, setActiveCell, cellRefs } = useDataGridContext<TData>();
  const value = column.accessor(row);
  const isActive =
    activeCell?.rowIndex === rowIndex && activeCell?.colIndex === colIndex;
  const key = cellKey(rowIndex, colIndex);

  return (
    <div
      ref={(el) => {
        if (el) cellRefs.current.set(key, el);
        else cellRefs.current.delete(key);
      }}
      role="gridcell"
      aria-rowindex={rowIndex + 2}
      aria-colindex={colIndex + 1}
      tabIndex={isActive ? 0 : -1}
      onFocus={() => setActiveCell({ rowIndex, colIndex })}
      onClick={() => setActiveCell({ rowIndex, colIndex })}
      className="isg-datagrid__cell"
    >
      {value}
    </div>
  );
}
