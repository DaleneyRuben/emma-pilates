import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import type { ReactNode } from "react";
import type { PageWindow } from "./pagination";
import { TablePagination, type RangeLabel } from "./table-pagination";

declare module "@tanstack/react-table" {
  // Money and dates sit on the right (design system → Table convention).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the interface must keep TanStack's type parameters.
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "right";
  }
}

type DataTableProps<Row> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack's accessor columns carry their own value type per column.
  columns: ColumnDef<Row, any>[];
  rows: Row[];
  rowId: (row: Row) => string;
  emptyMessage?: ReactNode;
  /** The whole row opens the record (design system → Table convention). */
  onRowClick?: (row: Row) => void;
  pagination: PageWindow & {
    onPageChange: (page: number) => void;
    rangeLabel?: RangeLabel;
  };
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
                <TableHead
                  key={header.id}
                  className={
                    header.column.columnDef.meta?.align === "right"
                      ? "text-right"
                      : undefined
                  }
                >
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
        <TableBody>
          {rows.length === 0 ? (
            // The header stays and the message sits in the body, so an empty
            // result reads as "nothing matched", not as a broken page.
            <TableRow className="hover:bg-transparent max-md:border-0 max-md:bg-transparent">
              <TableCell
                colSpan={columns.length}
                className="py-10 text-center text-cuerpo text-texto-tenue max-md:block max-md:before:content-none"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
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
                    className={
                      cell.column.columnDef.meta?.align === "right"
                        ? "md:text-right"
                        : undefined
                    }
                    data-label={headerLabel(cell.column.id)}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <TablePagination {...pagination} shown={rows.length} />
    </div>
  );
}
