import type { CashDayDto } from "@pilates/api-contracts";
import { createColumnHelper } from "@tanstack/react-table";
import { Info } from "lucide-react";
import type { ComponentProps } from "react";
import { StatusPill } from "../../components/ui/status-pill";
import { boliviaParts, formatWeekdayDay } from "../../lib/bolivia-time";
import { cn } from "../../lib/cn";
import { formatBolivianos } from "../../lib/money";

const columns = createColumnHelper<CashDayDto>();

const statuses = {
  closed: { tone: "exito", label: "Cerrada" },
  missing: { tone: "advertencia", label: "Sin cierre" },
  open: { tone: "neutral", label: "Abierta" },
} as const;

const adjustmentNote =
  "Una venta anulada o registrada después del cierre cambió las ventas del día.";

const signed = (centavos: number): string =>
  centavos === 0
    ? formatBolivianos(0)
    : `${centavos > 0 ? "+" : "−"}${formatBolivianos(Math.abs(centavos))}`;

const quiet = <span className="text-texto-tenue">—</span>;

// AW151: a short drawer on the Error tint, a surplus on Advertencia.
export const cashDayRowProps = (day: CashDayDto): ComponentProps<"tr"> => {
  const difference = day.close?.differenceCentavos ?? 0;
  if (difference === 0) return {};
  return difference < 0
    ? ({
        "data-difference": "short",
        className: "bg-error/[0.06]",
      } as ComponentProps<"tr">)
    : ({
        "data-difference": "over",
        className: "bg-advertencia/[0.08]",
      } as ComponentProps<"tr">);
};

export const cashDayColumns = [
  columns.accessor("businessDate", {
    header: "Fecha",
    cell: ({ getValue }) => (
      <span className="font-medium text-texto tabular">
        {formatWeekdayDay(getValue())}
      </span>
    ),
  }),
  columns.accessor("status", {
    header: "Estado",
    cell: ({ getValue }) => {
      const status = statuses[getValue()];
      return <StatusPill tone={status.tone}>{status.label}</StatusPill>;
    },
  }),
  columns.display({
    id: "expected",
    header: "Esperado",
    meta: { align: "right" },
    cell: ({ row }) =>
      row.original.close === null ? (
        <span className="text-texto-tenue tabular">
          {formatBolivianos(row.original.cashSalesCentavos)}
        </span>
      ) : (
        <span className="text-texto tabular">
          {formatBolivianos(row.original.close.expectedCentavos)}
        </span>
      ),
  }),
  columns.display({
    id: "counted",
    header: "Contado",
    meta: { align: "right" },
    cell: ({ row }) =>
      row.original.close === null ? (
        quiet
      ) : (
        <span className="text-texto tabular">
          {formatBolivianos(row.original.close.countedCentavos)}
        </span>
      ),
  }),
  columns.display({
    id: "difference",
    header: "Diferencia",
    meta: { align: "right" },
    cell: ({ row }) => {
      const close = row.original.close;
      if (close === null) return quiet;
      const tone =
        close.differenceCentavos === 0
          ? "text-texto-secundario"
          : close.differenceCentavos < 0
            ? "font-medium text-error-texto"
            : "font-medium text-advertencia-texto";
      return (
        <span className={cn(tone, "tabular")}>
          {signed(close.differenceCentavos)}
        </span>
      );
    },
  }),
  columns.display({
    id: "adjustment",
    header: "Ajuste",
    meta: { align: "right" },
    cell: ({ row }) => {
      const adjustment = row.original.close?.adjustmentCentavos ?? 0;
      if (adjustment === 0) return null;
      return (
        <span
          title={adjustmentNote}
          className="inline-flex items-center gap-1 text-nota text-texto-secundario tabular"
        >
          <Info size={12} strokeWidth={1.8} aria-hidden="true" />
          {signed(adjustment)}
        </span>
      );
    },
  }),
  columns.display({
    id: "closedBy",
    header: "Cerró",
    cell: ({ row }) =>
      row.original.close === null ? (
        quiet
      ) : (
        <span className="text-nota text-texto-secundario">
          {`${row.original.close.closedByName} · ${boliviaParts(row.original.close.closedAt).time}`}
        </span>
      ),
  }),
  columns.display({
    id: "note",
    header: "Nota",
    cell: ({ row }) => {
      const note = row.original.close?.note ?? null;
      return note === null ? null : (
        <span
          title={note}
          className="block max-w-[220px] truncate text-nota text-texto-secundario max-md:max-w-none max-md:whitespace-normal"
        >
          {note}
        </span>
      );
    },
  }),
];
