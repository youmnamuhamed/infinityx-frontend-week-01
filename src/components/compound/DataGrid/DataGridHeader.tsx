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
      {engine.visibleColumns.map((column, index) => {
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

        const isFirst = index === 0;
        const isLast = index === engine.visibleColumns.length - 1;

        const handleMoveLeft = (event: MouseEvent): void => {
          event.stopPropagation();
          engine.moveColumnLeft(column.id);
        };

        const handleMoveRight = (event: MouseEvent): void => {
          event.stopPropagation();
          engine.moveColumnRight(column.id);
        };

        return (
          <div
            key={column.id}
            role="columnheader"
            aria-sort={isSortable ? ariaSort : undefined}
            className="isg-datagrid__header-cell"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <span
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
              style={{ cursor: isSortable ? "pointer" : undefined, flex: 1 }}
            >
              {column.header}
              {sortRule ? (
                <span aria-hidden="true">
                  {sortRule.direction === "asc" ? " \u25B2" : " \u25BC"}
                </span>
              ) : null}
            </span>

            <button
              type="button"
              onClick={handleMoveLeft}
              disabled={isFirst}
              aria-label={`Move ${column.header} column left`}
              className="isg-datagrid__reorder-btn"
              style={{
                cursor: isFirst ? "not-allowed" : "pointer",
                opacity: isFirst ? 0.35 : 1,
              }}
            >
              <span aria-hidden="true">{"\u25C0"}</span>
            </button>
            <button
              type="button"
              onClick={handleMoveRight}
              disabled={isLast}
              aria-label={`Move ${column.header} column right`}
              className="isg-datagrid__reorder-btn"
              style={{
                cursor: isLast ? "not-allowed" : "pointer",
                opacity: isLast ? 0.35 : 1,
              }}
            >
              <span aria-hidden="true">{"\u25B6"}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}