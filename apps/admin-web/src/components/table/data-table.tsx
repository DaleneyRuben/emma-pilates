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
import { useMediaQuery } from "../../shell/use-media-query";
import { CompactRow } from "./compact-row";
import type { PageWindow } from "./pagination";
import { TablePagination, type RangeLabel } from "./table-pagination";

declare module "@tanstack/react-table" {
  // Money and dates sit on the right (design system → Table convention).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the interface must keep TanStack's type parameters.
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "right";
    /**
     * FIX-088 (Tablas en celular A): the column's place in the phone card.
     * By default the first column is the title, «Estado» the status, a
     * column without a header the actions, and the rest the detail line.
     */
    card?: CardPart;
    /** Order inside the detail line; column order by default. */
    cardOrder?: number;
    /** A word before a figure that reads ambiguously alone («Contado»). */
    cardLabel?: string;
  }
}

export type CardPart = "title" | "detail" | "status" | "actions" | "hidden";

/** Below md (a phone) a row is a compact card, not a stack of labels. */
export const phoneViewportQuery = "(max-width: 767px)";

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
  /** FIX-089 (ListaC): a person list's 40 px circle in the phone card. */
  avatar?: (row: Row) => ReactNode;
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
  avatar,
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

  const phone = useMediaQuery(phoneViewportQuery);
  const headerLabel = (columnId: string): string => {
    const header = table.getColumn(columnId)?.columnDef.header;
    return typeof header === "string" ? header : "";
  };

  return (
    <div className="flex flex-col gap-3">
      <Table
        footer={
          pagination === undefined ? undefined : (
            <TablePagination {...pagination} shown={rows.length} />
          )
        }
      >
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
                // Rosa Emma (rw.py empty): a multi-line empty message leads with its
                // first line in Lora 24.
                className="px-3 py-9 text-center text-cuerpo text-texto max-md:block max-md:before:content-none [&>span>span:first-child]:mb-1 [&>span>span:first-child]:font-serif [&>span>span:first-child]:text-[24px] [&>span>span:first-child]:leading-tight"
              >
                {typeof emptyMessage === "string" ? (
                  <span className="font-serif text-[24px] leading-tight">
                    {emptyMessage}
                  </span>
                ) : (
                  emptyMessage
                )}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => {
              const clickable =
                onRowClick !== undefined && canClickRow(row.original);
              const extra = rowProps?.(row.original) ?? {};
              if (phone) {
                const clickRow = clickable
                  ? () => onRowClick(row.original)
                  : undefined;
                return (
                  <CompactRow
                    key={row.id}
                    row={row}
                    extra={extra}
                    avatar={avatar?.(row.original)}
                    onClick={clickRow}
                  />
                );
              }
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
    </div>
  );
}
