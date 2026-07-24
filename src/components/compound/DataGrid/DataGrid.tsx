"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type MutableRefObject,
} from "react";
import type { UseDataGridResult } from "@/core/hooks/useDataGrid";

export interface ActiveCell {
  rowIndex: number;
  colIndex: number;
}

export function cellKey(rowIndex: number, colIndex: number): string {
  return `${rowIndex}:${colIndex}`;
}

export interface DataGridContextValue<TData> {
  engine: UseDataGridResult<TData>;
  rowHeight: number;
  activeCell: ActiveCell | null;
  setActiveCell: (cell: ActiveCell) => void;
  cellRefs: MutableRefObject<Map<string, HTMLDivElement>>;
}

const DataGridContext = createContext<DataGridContextValue<unknown> | null>(
  null,
);

export function useDataGridContext<TData>(): DataGridContextValue<TData> {
  const context = useContext(DataGridContext);
  if (!context) {
    throw new Error(
      "DataGrid compound components must be rendered inside <DataGrid>.",
    );
  }
  return context as DataGridContextValue<TData>;
}

const DEFAULT_ROW_HEIGHT = 48;

export interface DataGridRootProps<TData> {
  engine: UseDataGridResult<TData>;
  rowHeight?: number;
  children: ReactNode;
  "aria-label"?: string;
}

export function DataGridRoot<TData>({
  engine,
  rowHeight = DEFAULT_ROW_HEIGHT,
  children,
  ...ariaProps
}: DataGridRootProps<TData>) {
  const [activeCell, setActiveCell] = useState<ActiveCell | null>({
    rowIndex: 0,
    colIndex: 0,
  });
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const contextValue: DataGridContextValue<unknown> = {
    engine: engine as UseDataGridResult<unknown>,
    rowHeight,
    activeCell,
    setActiveCell,
    cellRefs,
  };

  return (
    <DataGridContext.Provider value={contextValue}>
      <div
        role="grid"
        aria-rowcount={engine.rowCount}
        aria-colcount={engine.visibleColumns.length}
        className="isg-datagrid"
        {...ariaProps}
      >
        {children}
      </div>
    </DataGridContext.Provider>
  );
}
