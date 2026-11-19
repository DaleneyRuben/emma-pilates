import { formatListDate } from "@pilates/api-contracts";
import type { FreezeReviewDto } from "@pilates/api-contracts";
import { createColumnHelper } from "@tanstack/react-table";
import { ClientPhoto } from "../../components/client-photo";
import { Button } from "../../components/ui/button";
import { StatusPill } from "../../components/ui/status-pill";
import { formatDayRange } from "../../lib/day-range";
import {
  freezeDayCount,
  freezeDecidedBy,
  freezeDecidedPlanEnd,
} from "./freeze-format";

const columns = createColumnHelper<FreezeReviewDto>();

const quiet = (text: string | undefined) => (
  <span className="text-texto-secundario tabular">{text ?? "—"}</span>
);

const clientColumn = columns.accessor("clientName", {
  header: "Clienta",
  cell: ({ row }) => (
    <span className="flex items-center gap-2.5">
      <ClientPhoto
        name={row.original.clientName}
        photo={row.original.clientPhoto}
      />
      <span className="font-medium text-texto">{row.original.clientName}</span>
    </span>
  ),
});

const periodColumns = [
  columns.accessor("planName", {
    header: "Plan",
    cell: ({ getValue }) => (
      <span className="text-texto-secundario">{getValue()}</span>
    ),
  }),
  columns.accessor("startsOn", {
    header: "Desde",
    cell: ({ getValue }) => quiet(formatListDate(getValue())),
  }),
  columns.accessor("endsOn", {
    header: "Hasta",
    cell: ({ getValue }) => quiet(formatListDate(getValue())),
  }),
  columns.display({
    id: "days",
    header: "Días",
    meta: { card: "hidden" },
    cell: ({ row }) =>
      quiet(freezeDayCount(row.original.startsOn, row.original.endsOn)),
  }),
];

// Finding 52: the approver sees what approving does to the plan end.
// FIX-091 (W16 A): what she asks, its days, and the end approving produces,
// with «Revisar»; the Plan, the end before, the reason, and the decision are
// in the review panel it opens.
export const pendingFreezeColumns = (open: (row: FreezeReviewDto) => void) => [
  clientColumn,
  columns.display({
    id: "asks",
    header: "Pide",
    cell: ({ row }) =>
      quiet(formatDayRange(row.original.startsOn, row.original.endsOn)),
  }),
  columns.display({
    id: "days",
    header: "Días",
    meta: { card: "hidden" },
    cell: ({ row }) =>
      quiet(freezeDayCount(row.original.startsOn, row.original.endsOn)),
  }),
  columns.display({
    id: "planEnd",
    header: "Vencería",
    meta: { card: "detail", cardLabel: "Vencería" },
    cell: ({ row }) => {
      const after = row.original.planEndsOnAfter;
      return quiet(after == null ? undefined : formatListDate(after));
    },
  }),
  columns.display({
    id: "review",
    header: "",
    meta: { card: "actions" },
    cell: ({ row }) => (
      <Button
        size="sm"
        variant="link"
        className="underline"
        onClick={(event) => {
          event.stopPropagation();
          open(row.original);
        }}
      >
        Revisar
      </Button>
    ),
  }),
];

// Finding 53: a decided request is history, so it carries no decision.
export const decidedFreezeColumns = () => [
  clientColumn,
  ...periodColumns,
  columns.accessor("state", {
    header: "Resultado",
    cell: ({ row, getValue }) =>
      getValue() === "approved" ? (
        <StatusPill tone="exito">Aprobada</StatusPill>
      ) : getValue() === "withdrawn" ? (
        <StatusPill tone="neutral">Retirada</StatusPill>
      ) : (
        <span className="flex flex-col items-start gap-1">
          <StatusPill tone="error">Rechazada</StatusPill>
          {/* W16 B/C: what the Client was told. */}
          {row.original.refusalReason == null ? null : (
            <span className="text-nota text-texto-tenue">
              {row.original.refusalReason}
            </span>
          )}
        </span>
      ),
  }),
  columns.display({
    id: "planEnd",
    header: "Vence",
    meta: { card: "detail", cardLabel: "Vence" },
    cell: ({ row }) => quiet(freezeDecidedPlanEnd(row.original)),
  }),
  columns.display({
    id: "decidedBy",
    header: "Decisión",
    meta: { card: "actions" },
    cell: ({ row }) => quiet(freezeDecidedBy(row.original)),
  }),
];
