"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { useDataGridContext } from "./DataGrid";

export interface DataGridHeaderProps {
  className?: string;
}

export function DataGridHeader<TData>({ className }: DataGridHeaderProps) {
  const { engine } = useDataGridContext<TData>();

  return (
    <div
      role="row"
      aria-rowindex={1}
      className={className ?? "isg-datagrid__header-row"}
    >
      {engine.visibleColumns.map((column) => {
        const isSortable = column.sortable !== false;
        const sortRule = engine.sortingState.find(
          (rule) => rule.columnId === column.id,
        );
        const ariaSort = sortRule
          ? sortRule.direction === "asc"
            ? "ascending"
            : "descending"
          : "none";

        const handleActivate = (event: MouseEvent | KeyboardEvent): void => {
          engine.toggleSort(column.id, event.shiftKey);
        };

        return (
          <div
            key={column.id}
            role="columnheader"
            aria-sort={isSortable ? ariaSort : undefined}
            tabIndex={isSortable ? 0 : undefined}
            onClick={isSortable ? handleActivate : undefined}
            onKeyDown={
              isSortable
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleActivate(event);
                    }
                  }
                : undefined
            }
            className="isg-datagrid__header-cell"
          >
            {column.header}
            {sortRule ? (
              <span aria-hidden="true">
                {sortRule.direction === "asc" ? " \u25B2" : " \u25BC"}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
