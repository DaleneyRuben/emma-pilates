import { formatDateTime } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { useState } from "react";
import { staffOptionLabel } from "../../back-office/payroll/payroll-format";
import { CatalogPage } from "../../catalog/catalog-page";
import type { SearchChange } from "../../catalog/catalog-search";
import { NoBranchPage } from "../../components/page/no-branch-page";
import { ListFilter } from "../../components/table/list-filter";
import { countFormat, pageRangeLabel } from "../../components/table/pagination";
import { useKnownOption } from "../../components/table/use-known-option";
import { WeekStepper } from "../../components/table/week-stepper";
import { boliviaToday, weekStartOf } from "../../lib/bolivia-time";
import type { Branch } from "../../shell/branch/branch-context";
import { useBranchSelection } from "../../shell/branch/use-branch-selection";
import {
  branchNutritionistsQueryOptions,
  evaluationTableQueryOptions,
  nextEvaluationQueryOptions,
  type EvaluationRow,
} from "./evaluation-queries";
import type { EvaluationSearch } from "./evaluation-search";

// NUT-001 D12: derived from the Client's earlier Evaluations, as on S15.
const kindLabels = {
  first: "Primera evaluación",
  follow_up: "Seguimiento",
} as const;

// `next` is undefined when the read of the next one failed: then only the
// week is known to be empty.
const booked = (count: number, next: string | null | undefined) =>
  count > 0
    ? `${countFormat.format(count)} ${count === 1 ? "evaluación agendada" : "evaluaciones agendadas"}`
    : next === undefined
      ? "ninguna en la semana"
      : next === null
        ? "ninguna evaluación agendada"
        : `ninguna en la semana · próxima: ${formatDateTime(next)}`;

const columns = createColumnHelper<EvaluationRow>();

// Invariant 10: no status column (an Evaluation records no attendance) and
// no detail to open; the row is the whole appointment.
const evaluationColumns = () => [
  columns.accessor("clientName", {
    header: "Clienta",
    cell: ({ row }) => (
      <span className="flex flex-col">
        <span className="tipo-titulo-fila text-texto">
          {row.original.clientName}
        </span>
        <span className="tipo-secundario text-texto">
          {kindLabels[row.original.kind]}
        </span>
      </span>
    ),
  }),
  columns.accessor("nutritionistName", {
    header: "Nutricionista",
    cell: ({ getValue }) => <span className="text-texto">{getValue()}</span>,
  }),
  columns.accessor("startsAt", {
    header: "Fecha y hora",
    cell: ({ getValue }) => (
      <span className="text-texto tabular">{formatDateTime(getValue())}</span>
    ),
  }),
];

function EmptyWeek({ filtered }: { filtered: boolean }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto">Sin evaluaciones en este rango.</span>
      <span>
        {filtered
          ? "Prueba con otra semana o quita el filtro de nutricionista."
          : "Prueba con otra semana."}
      </span>
      <span>
        Las clientas las agendan desde la app; la nutricionista publica su
        disponibilidad en la app del personal.
      </span>
    </span>
  );
}

function BranchEvaluations({
  branch,
  search,
  onSearchChange,
}: {
  branch: Branch;
  search: EvaluationSearch;
  onSearchChange: SearchChange<EvaluationSearch>;
}) {
  const today = boliviaToday();
  const monday = weekStartOf(search.week ?? today);
  const query = useQuery(
    evaluationTableQueryOptions(branch.id, monday, search),
  );
  // Walkthrough finding 66: an empty week names the next Evaluation, so a
  // Sunday's view of this week does not read as «none at all».
  const [now] = useState(() => new Date().toISOString());
  const weekEmpty = query.data?.totalItems === 0;
  const next = useQuery({
    ...nextEvaluationQueryOptions(
      branch.id,
      now,
      search.nutritionistStaffMemberId,
    ),
    enabled: weekEmpty,
  });
  const nutritionists = useQuery(branchNutritionistsQueryOptions(branch.id));
  useKnownOption(search.nutritionistStaffMemberId, nutritionists.data, () =>
    onSearchChange({ nutritionistStaffMemberId: undefined, page: 1 }),
  );

  return (
    <CatalogPage
      title="Nutrición"
      subtitle={
        query.data === undefined || (weekEmpty && next.isPending)
          ? `Sucursal ${branch.name}`
          : `Sucursal ${branch.name} · ${booked(query.data.totalItems, next.data === undefined ? undefined : (next.data?.startsAt ?? null))}`
      }
      loadingMessage="Cargando evaluaciones…"
      what="las evaluaciones"
      emptyMessage={
        <EmptyWeek filtered={search.nutritionistStaffMemberId !== undefined} />
      }
      filter={
        <div className="flex flex-wrap items-center gap-3">
          <WeekStepper
            monday={monday}
            today={today}
            onChange={(week) => onSearchChange({ week, page: 1 })}
          />
          <ListFilter
            label="Nutricionista"
            value={search.nutritionistStaffMemberId ?? "all"}
            options={[
              { value: "all", label: "Todas" },
              ...(nutritionists.data ?? []).map((member) => ({
                value: member.id,
                label: staffOptionLabel(member),
              })),
            ]}
            onChange={(value) =>
              onSearchChange({
                nutritionistStaffMemberId: value === "all" ? undefined : value,
                page: 1,
              })
            }
          />
        </div>
      }
      search={search}
      onPageChange={(page) => onSearchChange({ page })}
      rangeLabel={(window) =>
        window.totalItems === 0
          ? pageRangeLabel(window)
          : `${pageRangeLabel(window)} ${window.totalItems === 1 ? "evaluación" : "evaluaciones"}`
      }
      query={query}
      columns={evaluationColumns}
    />
  );
}

// AW25: a read-only view of the booked Evaluations at the selected Branch;
// the Nutritionist runs the agenda from the Staff app (S15–S17).
export function EvaluationsPage({
  search,
  onSearchChange,
}: {
  search: EvaluationSearch;
  onSearchChange: SearchChange<EvaluationSearch>;
}) {
  const { selectedBranch, status } = useBranchSelection();
  if (selectedBranch === undefined) {
    return (
      <NoBranchPage
        title="Nutrición"
        pending={status === "pending"}
        loadingMessage="Cargando evaluaciones…"
        emptyMessage="Todavía no hay sucursales activas. Las evaluaciones se ven por sucursal."
      />
    );
  }
  return (
    <BranchEvaluations
      key={selectedBranch.id}
      branch={selectedBranch}
      search={search}
      onSearchChange={onSearchChange}
    />
  );
}
