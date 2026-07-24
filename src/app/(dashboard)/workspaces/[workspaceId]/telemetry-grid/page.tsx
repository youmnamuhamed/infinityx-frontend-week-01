'use client';

import { useMemo, useState } from 'react';
import { DataGrid } from '@/components/compound/DataGrid';
import { useDataGrid, type ColumnDef } from '@/core/hooks/useDataGrid';
import { generateAuditData, type AuditRecord } from '@/core/utils/generateAuditData';

const RECORD_COUNT = 100_000;

const columns: ColumnDef<AuditRecord>[] = [
  { id: 'timestamp', header: 'Timestamp', accessor: (row) => row.timestamp },
  { id: 'actor', header: 'Actor', accessor: (row) => row.actor },
  { id: 'action', header: 'Action', accessor: (row) => row.action },
  { id: 'resource', header: 'Resource', accessor: (row) => row.resource },
  { id: 'status', header: 'Status', accessor: (row) => row.status },
  { id: 'ipAddress', header: 'IP Address', accessor: (row) => row.ipAddress },
  { id: 'durationMs', header: 'Duration (ms)', accessor: (row) => row.durationMs },
];

export default function TelemetryGridPage() {
  const data = useMemo(() => generateAuditData(RECORD_COUNT), []);
  const [filterInput, setFilterInput] = useState('');

  const grid = useDataGrid<AuditRecord>({
    data,
    columns,
    getRowId: (row) => row.id,
  });

  return (
    <div className="isg-telemetry-page">
      <header className="isg-telemetry-page__header">
        <h1>Telemetry Audit Log</h1>
        <p>{grid.rowCount.toLocaleString()} of {RECORD_COUNT.toLocaleString()} records</p>
        <input
          type="text"
          value={filterInput}
          onChange={(event) => {
            setFilterInput(event.target.value);
            grid.setGlobalFilter(event.target.value);
          }}
          placeholder="Filter across all columns…"
          className="isg-telemetry-page__filter"
        />
      </header>

      <DataGrid engine={grid} rowHeight={48} aria-label="Telemetry audit log">
        <DataGrid.Header />
        <DataGrid.Body height={600} />
      </DataGrid>
    </div>
  );
}