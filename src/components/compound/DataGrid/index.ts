import { DataGridRoot } from "./DataGrid";
import { DataGridHeader } from "./DataGridHeader";
import { DataGridBody } from "./DataGridBody";
import { DataGridCell } from "./DataGridCell";

export const DataGrid = Object.assign(DataGridRoot, {
  Header: DataGridHeader,
  Body: DataGridBody,
  Cell: DataGridCell,
}) as typeof DataGridRoot & {
  Header: typeof DataGridHeader;
  Body: typeof DataGridBody;
  Cell: typeof DataGridCell;
};

export { useDataGridContext } from "./DataGrid";
export type { DataGridContextValue, DataGridRootProps } from "./DataGrid";
