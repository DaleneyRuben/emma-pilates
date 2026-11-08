import type { FreezeReviewDto } from "@pilates/api-contracts";
import { createColumnHelper } from "@tanstack/react-table";
import { ClientPhoto } from "../../components/client-photo";
import { StatusPill } from "../../components/ui/status-pill";
import { formatCivilDate } from "../../lib/bolivia-time";
import { DecisionCell } from "./decision-cell";
import {
  freezeDayCount,
  freezeDecidedBy,
  freezeDecidedPlanEnd,
  freezePendingPlanEnd,
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
    cell: ({ getValue }) => quiet(formatCivilDate(getValue())),
  }),
  columns.accessor("endsOn", {
    header: "Hasta",
    cell: ({ getValue }) => quiet(formatCivilDate(getValue())),
  }),
  columns.display({
    id: "days",
    header: "Días",
    cell: ({ row }) =>
      quiet(freezeDayCount(row.original.startsOn, row.original.endsOn)),
  }),
];

// Finding 52: the approver sees what approving does to the plan end.
export const pendingFreezeColumns = (onDone: (message: string) => void) => [
  clientColumn,
  ...periodColumns,
  columns.display({
    id: "planEnd",
    header: "Vence",
    cell: ({ row }) => quiet(freezePendingPlanEnd(row.original)),
  }),
  columns.accessor("reason", {
    header: "Motivo",
    cell: ({ getValue }) => (
      <span className="text-texto-secundario">{getValue()}</span>
    ),
  }),
  columns.display({
    id: "decision",
    header: "Decisión",
    cell: ({ row }) => <DecisionCell freeze={row.original} onDone={onDone} />,
  }),
];

// Finding 53: a decided request is history, so it carries no decision.
export const decidedFreezeColumns = () => [
  clientColumn,
  ...periodColumns,
  columns.accessor("state", {
    header: "Resultado",
    cell: ({ getValue }) =>
      getValue() === "approved" ? (
        <StatusPill tone="exito">Aprobado</StatusPill>
      ) : (
        <StatusPill tone="error">Rechazado</StatusPill>
      ),
  }),
  columns.display({
    id: "planEnd",
    header: "Vence",
    cell: ({ row }) => quiet(freezeDecidedPlanEnd(row.original)),
  }),
  columns.display({
    id: "decidedBy",
    header: "Decisión",
    cell: ({ row }) => quiet(freezeDecidedBy(row.original)),
  }),
];
