"use client";

import { useEffect, type KeyboardEvent } from "react";
import { cellKey, useDataGridContext } from "./DataGrid";
import { useVirtualizer } from "@/core/hooks/useVirtualizer";
import { DataGridCell } from "./DataGridCell";

export interface DataGridBodyProps {
  height?: number;
  className?: string;
}

export function DataGridBody<TData>({
  height = 600,
  className,
}: DataGridBodyProps) {
  const { engine, rowHeight, activeCell, setActiveCell, cellRefs } =
    useDataGridContext<TData>();
  const { scrollElementRef, virtualItems, totalSize } =
    useVirtualizer<HTMLDivElement>({
      rowCount: engine.rowCount,
      rowHeight,
    });

  // After scroll/re-render settles, focus the active cell if it's now mounted.
  // Runs again whenever virtualItems changes, so a cell that scrolls into view
  // a frame after the keypress still picks up focus.
  useEffect(() => {
    if (!activeCell) return;
    const el = cellRefs.current.get(
      cellKey(activeCell.rowIndex, activeCell.colIndex),
    );
    if (el && document.activeElement !== el) el.focus();
  }, [activeCell, virtualItems, cellRefs]);

  const scrollRowIntoView = (rowIndex: number): void => {
    const container = scrollElementRef.current;
    if (!container) return;
    const rowTop = rowIndex * rowHeight;
    const rowBottom = rowTop + rowHeight;
    if (rowTop < container.scrollTop) {
      container.scrollTop = rowTop;
    } else if (rowBottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = rowBottom - container.clientHeight;
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!activeCell) return;
    const maxRowIndex = engine.rowCount - 1;
    const maxColIndex = engine.visibleColumns.length - 1;
    let { rowIndex, colIndex } = activeCell;
    const container = scrollElementRef.current;
    const pageSize = container
      ? Math.max(1, Math.floor(container.clientHeight / rowHeight))
      : 10;

    switch (event.key) {
      case "ArrowUp":
        rowIndex = Math.max(0, rowIndex - 1);
        break;
      case "ArrowDown":
        rowIndex = Math.min(maxRowIndex, rowIndex + 1);
        break;
      case "ArrowLeft":
        colIndex = Math.max(0, colIndex - 1);
        break;
      case "ArrowRight":
        colIndex = Math.min(maxColIndex, colIndex + 1);
        break;
      case "Home":
        colIndex = 0;
        break;
      case "End":
        colIndex = maxColIndex;
        break;
      case "PageUp":
        rowIndex = Math.max(0, rowIndex - pageSize);
        break;
      case "PageDown":
        rowIndex = Math.min(maxRowIndex, rowIndex + pageSize);
        break;
      case " ":
      case "Enter": {
        const row = engine.rows[rowIndex];
        if (row) {
          engine.toggleRowSelection(engine.getRowId(row), rowIndex, {
            shiftKey: event.shiftKey,
            metaOrCtrlKey: event.ctrlKey || event.metaKey,
          });
        }
        event.preventDefault();
        return;
      }
      default:
        return;
    }

    event.preventDefault();
    setActiveCell({ rowIndex, colIndex });
    scrollRowIntoView(rowIndex);
  };

  return (
    <div
      ref={scrollElementRef}
      role="rowgroup"
      className={className ?? "isg-datagrid__body"}
      style={{ height, overflow: "auto", position: "relative" }}
      onKeyDown={handleKeyDown}
    >
      <div style={{ height: totalSize, position: "relative" }}>
        {virtualItems.map((virtualItem) => {
          const row = engine.rows[virtualItem.index];
          if (!row) return null;

          return (
            <div
              key={virtualItem.index}
              role="row"
              aria-rowindex={virtualItem.index + 2}
              aria-selected={engine.isRowSelected(engine.getRowId(row))}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: virtualItem.size,
                transform: `translateY(${virtualItem.start}px)`,
                display: "flex",
              }}
            >
              {engine.visibleColumns.map((column, colIndex) => (
                <DataGridCell
                  key={column.id}
                  column={column}
                  row={row}
                  rowIndex={virtualItem.index}
                  colIndex={colIndex}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
