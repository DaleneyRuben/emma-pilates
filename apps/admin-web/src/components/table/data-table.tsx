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
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
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
  /** Rows the click opens; the others stay plain (every row by default). */
  canClickRow?: (row: Row) => boolean;
  /** Extra attributes for a row, such as AW151's tint for a difference. */
  rowProps?: (row: Row) => ComponentProps<"tr">;
  /** A month view (AW151) shows every row and its own summary instead. */
  pagination?: PageWindow & {
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
  canClickRow = () => true,
  rowProps,
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
    rowCount: pagination?.totalItems ?? rows.length,
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
            table.getRowModel().rows.map((row) => {
              const clickable =
                onRowClick !== undefined && canClickRow(row.original);
              const extra = rowProps?.(row.original) ?? {};
              return (
                <TableRow
                  key={row.id}
                  {...extra}
                  onClick={
                    clickable ? () => onRowClick(row.original) : undefined
                  }
                  className={cn(
                    clickable ? "cursor-pointer" : undefined,
                    extra.className,
                  )}
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
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      {pagination === undefined ? null : (
        <TablePagination {...pagination} shown={rows.length} />
      )}
    </div>
  );
}
