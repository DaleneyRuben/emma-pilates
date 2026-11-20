import { flexRender, type Cell, type Row } from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
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

type Slot = "avatar" | "text" | "status" | "chevron";

// The phone card's grid: an optional 40 px circle, the text, an optional
// status, and a chevron when the row opens something. Tailwind needs every
// class spelled out, so each layout has its template.
const templates: Record<string, string> = {
  "avatar text status chevron":
    "max-md:grid-cols-[40px_minmax(0,1fr)_auto_auto]",
  "avatar text status": "max-md:grid-cols-[40px_minmax(0,1fr)_auto]",
  "avatar text chevron": "max-md:grid-cols-[40px_minmax(0,1fr)_auto]",
  "avatar text": "max-md:grid-cols-[40px_minmax(0,1fr)]",
  "text status chevron": "max-md:grid-cols-[minmax(0,1fr)_auto_auto]",
  "text status": "max-md:grid-cols-[minmax(0,1fr)_auto]",
  "text chevron": "max-md:grid-cols-[minmax(0,1fr)_auto]",
  text: "max-md:grid-cols-[minmax(0,1fr)]",
};
const columnStart = [
  "col-start-1",
  "col-start-2",
  "col-start-3",
  "col-start-4",
];

/**
 * FIX-088 (Tablas en celular A): one row as a compact card at phone width.
 * FIX-089 (ListaC): a person list leads with her 40 px circle (photo or
 * Crema initials on Palo de rosa); the name at 15/500, one 13 px line with
 * the details joined by « · », the status on the right (a Rubor pill only
 * for an exception), a chevron when the row opens, and the row's own
 * actions under them.
 */
export function CompactRow<Data>({
  row,
  extra,
  avatar,
  onClick,
}: {
  row: Row<Data>;
  extra: ComponentProps<"tr">;
  /** A person list's circle; the title's own small photo then hides. */
  avatar?: ReactNode;
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
  const lead = avatar !== undefined;
  const chevron = onClick !== undefined;
  const slots: Slot[] = [
    ...(lead ? (["avatar"] as const) : []),
    "text",
    ...(status.length === 0 ? [] : (["status"] as const)),
    ...(chevron ? (["chevron"] as const) : []),
  ];
  const at = (slot: Slot) => columnStart[slots.indexOf(slot)];
  const cellBase = "max-md:block max-md:p-0 max-md:before:content-none";
  return (
    <TableRow
      {...extra}
      data-compact=""
      onClick={onClick}
      className={cn(
        "max-md:grid max-md:items-center max-md:gap-x-3 max-md:gap-y-0.5",
        templates[slots.join(" ")],
        chevron ? "cursor-pointer" : undefined,
        extra.className,
      )}
    >
      {lead ? (
        <TableCell
          data-part="avatar"
          className={cn(cellBase, at("avatar"), "row-span-2 row-start-1")}
        >
          {avatar}
        </TableCell>
      ) : null}
      {of("title").map(({ cell }) => (
        <TableCell
          key={cell.id}
          data-part="title"
          className={cn(
            cellBase,
            at("text"),
            "row-start-1 min-w-0 tipo-titulo-fila break-words text-texto",
            lead && "[&_[data-photo]]:hidden",
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
            at("status"),
            "row-span-2 row-start-1 text-right tipo-secundario",
          )}
        >
          {status.map(({ cell }) => (
            <span key={cell.id}>{render(cell)}</span>
          ))}
        </TableCell>
      )}
      {chevron ? (
        <TableCell
          aria-hidden="true"
          data-part="chevron"
          className={cn(
            cellBase,
            at("chevron"),
            "row-span-2 row-start-1 text-texto",
          )}
        >
          <ChevronRight size={18} strokeWidth={1.8} />
        </TableCell>
      ) : null}
      {details.length === 0 ? null : (
        <TableCell
          data-part="detail"
          className={cn(
            cellBase,
            at("text"),
            "row-start-2 min-w-0 truncate tipo-secundario text-texto [&>span:not(:empty)~span:not(:empty)]:before:content-['_·_'] [&>span>*]:inline [&>span>*>*]:inline [&>span>*>*+*]:before:content-['_·_']",
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
            "col-span-full mt-2 flex flex-wrap items-center gap-4 max-md:flex",
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
