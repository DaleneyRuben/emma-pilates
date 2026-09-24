import type { AdminPlanDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { ListFilter } from "../../components/table/list-filter";
import { StatusPill } from "../../components/ui/status-pill";
import { formatBolivianos } from "../../lib/money";
import { CatalogPage, RowOpener } from "../catalog-page";
import type {
  PlanSearch,
  PlanVisibility,
  SearchChange,
} from "../catalog-search";
import { allowanceLabel, durationLabel } from "./plan-format";
import { PlanPanelForm } from "./plan-panel";
import { planListQueryOptions } from "./plan-queries";

const visibilityOptions: { value: PlanVisibility; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "visible", label: "Visibles" },
  { value: "hidden", label: "Ocultos" },
];

const columns = createColumnHelper<AdminPlanDto>();

const planColumns = (open: (row: AdminPlanDto) => void) => [
  columns.accessor("name", {
    header: "Nombre",
    cell: ({ row }) => (
      <RowOpener label={row.original.name} onOpen={() => open(row.original)} />
    ),
  }),
  columns.accessor("durationMonths", {
    header: "Duración",
    cell: ({ getValue }) => durationLabel(getValue()),
  }),
  columns.accessor("classAllowance", {
    header: "Clases incluidas",
    cell: ({ getValue }) => (
      <span className="tabular">{allowanceLabel(getValue())}</span>
    ),
  }),
  columns.accessor("priceCentavos", {
    header: "Precio",
    cell: ({ getValue }) => (
      <span className="font-serif tabular">{formatBolivianos(getValue())}</span>
    ),
  }),
  columns.accessor("hiddenAt", {
    header: "Visibilidad",
    cell: ({ getValue }) =>
      getValue() === null ? (
        <StatusPill tone="exito">Visible</StatusPill>
      ) : (
        <StatusPill tone="neutral">Oculto</StatusPill>
      ),
  }),
];

// AW04: the Plan catalog Clients buy from in the app.
export function PlansPage({
  search,
  onSearchChange,
}: {
  search: PlanSearch;
  onSearchChange: SearchChange<PlanSearch>;
}) {
  const query = useQuery(
    planListQueryOptions({
      visibility: search.visibility,
      page: search.page,
      pageSize: search.pageSize,
    }),
  );

  return (
    <CatalogPage
      title="Planes"
      subtitle="El catálogo que las clientas ven al comprar un plan en la app."
      createLabel="Nuevo plan"
      loadingMessage="Cargando planes…"
      what="los planes"
      emptyMessage="No hay planes con este filtro."
      panelTitles={{ create: "Nuevo plan", edit: "Editar plan" }}
      filter={
        <ListFilter
          label="Visibilidad"
          value={search.visibility}
          options={visibilityOptions}
          onChange={(visibility) => onSearchChange({ visibility, page: 1 })}
        />
      }
      search={search}
      onPageChange={(page) => onSearchChange({ page })}
      query={query}
      columns={planColumns}
      renderForm={(plan, done) => <PlanPanelForm plan={plan} onDone={done} />}
    />
  );
}
