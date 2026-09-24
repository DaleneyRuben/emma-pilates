import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import type { PageWindow } from "./pagination";
import { TablePagination } from "./table-pagination";

type DataTableProps<Row> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack's accessor columns carry their own value type per column.
  columns: ColumnDef<Row, any>[];
  rows: Row[];
  rowId: (row: Row) => string;
  emptyMessage?: string;
  /** The whole row opens the record (design system → Table convention). */
  onRowClick?: (row: Row) => void;
  pagination: PageWindow & { onPageChange: (page: number) => void };
};

/**
 * Dense list table (design system → List pages): TanStack Table owns the
 * row model, the caller owns the page window (from the route search) and
 * the data (from TanStack Query). Cells carry their column name so the
 * narrow-browser card reflow can label them.
 */
export function DataTable<Row>({
  columns,
  rows,
  rowId,
  emptyMessage = "No hay registros.",
  onRowClick,
  pagination,
}: DataTableProps<Row>) {
  // TanStack Table hands back functions the React Compiler cannot memoize;
  // this app does not use the compiler.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getRowId: rowId,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: pagination.totalItems,
  });

  const headerLabel = (columnId: string): string => {
    const header = table.getColumn(columnId)?.columnDef.header;
    return typeof header === "string" ? header : "";
  };

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        {rows.length === 0 ? null : (
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={
                  onRowClick === undefined
                    ? undefined
                    : () => onRowClick(row.original)
                }
                className={
                  onRowClick === undefined ? undefined : "cursor-pointer"
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    data-label={headerLabel(cell.column.id)}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        )}
      </Table>
      {rows.length === 0 ? <TableEmpty>{emptyMessage}</TableEmpty> : null}
      <TablePagination {...pagination} />
    </div>
  );
}
