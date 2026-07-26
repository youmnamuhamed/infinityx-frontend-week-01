"use client";

import { useMemo } from "react";
import { useDataGrid, type ColumnDef } from "@/core/hooks/useDataGrid";
import { DataGridRoot } from "@/components/compound/DataGrid/DataGrid";
import { DataGridHeader } from "@/components/compound/DataGrid/DataGridHeader";
import { DataGridBody } from "@/components/compound/DataGrid/DataGridBody";

// Small, self-contained dataset — deliberately NOT using
// generateAuditData.ts so this scratch page has zero dependency on the
// real demo's data shape. Safe to delete this whole folder once dynamic
// sizing is verified.
interface TestRow {
  id: string;
  title: string;
  notes: string;
}

const NOTE_LENGTHS = [
  "Short note.",
  "A medium-length note that wraps onto a second line depending on column width and font size.",
  "Brief.",
  "This is a deliberately long note meant to force several lines of wrapped text so the row grows well beyond the 48px baseline height, which is exactly what we need to visually confirm dynamic row sizing is working end to end.",
  "One line.",
  "Another moderately long note, long enough to wrap at least once on a typical column width.",
];

function generateTestRows(count: number): TestRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    title: `Item ${i + 1}`,
    notes: NOTE_LENGTHS[i % NOTE_LENGTHS.length],
  }));
}

const columns: ColumnDef<TestRow>[] = [
  {
    id: "title",
    header: "Title",
    accessor: (row) => row.title,
    sortable: true,
    filterable: true,
  },
  {
    id: "notes",
    header: "Notes (variable height)",
    accessor: (row) => row.notes,
    sortable: false,
    filterable: true,
  },
];

export default function DynamicHeightTestPage() {
  const data = useMemo(() => generateTestRows(30), []);

  const grid = useDataGrid<TestRow>({
    data,
    columns,
    getRowId: (row) => row.id,
  });

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Dynamic Row Height — Scratch Test</h1>
      <p style={{ marginBottom: 16, color: "#666" }}>
        30 rows, alternating short/long notes. Rows should render at different
        heights, with no overlap, and keyboard navigation (arrows, Home/End,
        PageUp/PageDown) should track the real offsets.
      </p>
      <DataGridRoot engine={grid} rowHeight={48} enableDynamicSize>
        <DataGridHeader />
        <DataGridBody height={500} />
      </DataGridRoot>
    </div>
  );
}
