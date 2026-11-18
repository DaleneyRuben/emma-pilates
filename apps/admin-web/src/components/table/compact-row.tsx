import { flexRender, type Cell, type Row } from "@tanstack/react-table";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { TableCell, TableRow } from "../ui/table";
import type { CardPart } from "./data-table";

const statusHeaders = new Set(["Estado", "Resultado"]);

// The default place of a column in the card (see `ColumnMeta.card`).
function partOf<Data>(cell: Cell<Data, unknown>, index: number): CardPart {
  const { meta, header } = cell.column.columnDef;
  if (meta?.card !== undefined) return meta.card;
  if (index === 0) return "title";
  if (typeof header === "string" && statusHeaders.has(header)) {
    return "status";
  }
  if (header === "" || header === undefined) return "actions";
  return "detail";
}

const render = <Data,>(cell: Cell<Data, unknown>) =>
  flexRender(cell.column.columnDef.cell, cell.getContext());

/**
 * FIX-088 (Tablas en celular A): one row as a compact card at phone width.
 * The main text in bold, one grey line with the details joined by « · »,
 * the status on the right, and the row's own actions under them.
 */
export function CompactRow<Data>({
  row,
  extra,
  onClick,
}: {
  row: Row<Data>;
  extra: ComponentProps<"tr">;
  onClick?: () => void;
}) {
  const cells = row.getVisibleCells().map((cell, index) => ({
    cell,
    part: partOf(cell, index),
    order: cell.column.columnDef.meta?.cardOrder ?? 100 + index,
  }));
  const of = (part: CardPart) =>
    cells
      .filter((entry) => entry.part === part)
      .sort((a, b) => a.order - b.order);
  const actions = of("actions");
  const status = of("status");
  const details = of("detail");
  const cellBase = "max-md:block max-md:p-0 max-md:before:content-none";
  return (
    <TableRow
      {...extra}
      data-compact=""
      onClick={onClick}
      className={cn(
        "max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-3 max-md:gap-y-0.5",
        onClick === undefined ? undefined : "cursor-pointer",
        extra.className,
      )}
    >
      {of("title").map(({ cell }) => (
        <TableCell
          key={cell.id}
          data-part="title"
          className={cn(
            cellBase,
            "min-w-0 text-cuerpo font-medium break-words text-texto",
          )}
        >
          {render(cell)}
        </TableCell>
      ))}
      {status.length === 0 ? null : (
        <TableCell
          data-part="status"
          className={cn(
            cellBase,
            // The phone card's exception is a dot and its word, no pill.
            "col-start-2 row-span-2 row-start-1 pt-0.5 text-right text-nota [&_[data-status-pill]]:h-auto [&_[data-status-pill]]:bg-transparent [&_[data-status-pill]]:px-0 [&_[data-status-pill]]:font-normal",
          )}
        >
          {status.map(({ cell }) => (
            <span key={cell.id}>{render(cell)}</span>
          ))}
        </TableCell>
      )}
      {details.length === 0 ? null : (
        <TableCell
          data-part="detail"
          className={cn(
            cellBase,
            "col-start-1 min-w-0 text-nota text-texto-tenue [&>span:not(:empty)~span:not(:empty)]:before:content-['_·_'] [&>span>*]:inline [&>span>*>*]:inline [&>span>*>*+*]:before:content-['_·_']",
          )}
        >
          {details.map(({ cell }) => {
            const label = cell.column.columnDef.meta?.cardLabel;
            return (
              <span key={cell.id} className="empty:hidden">
                {label === undefined ? null : (
                  <span data-card-label="">{`${label} `}</span>
                )}
                {render(cell)}
              </span>
            );
          })}
        </TableCell>
      )}
      {actions.length === 0 ? null : (
        <TableCell
          data-part="actions"
          className={cn(
            cellBase,
            "col-span-2 mt-2 flex flex-wrap items-center gap-4 max-md:flex",
          )}
        >
          {actions.map(({ cell }) => (
            <span key={cell.id}>{render(cell)}</span>
          ))}
        </TableCell>
      )}
    </TableRow>
  );
}
