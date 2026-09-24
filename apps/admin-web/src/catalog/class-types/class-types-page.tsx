import type { AdminClassTypeDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { ListFilter } from "../../components/table/list-filter";
import { StatusPill } from "../../components/ui/status-pill";
import { CatalogPage, RowOpener } from "../catalog-page";
import type {
  CatalogStatus,
  CatalogStatusSearch,
  SearchChange,
} from "../catalog-search";
import { ClassTypePanelForm } from "./class-type-panel";
import { classTypeListQueryOptions } from "./class-type-queries";

const statusOptions: { value: CatalogStatus; label: string }[] = [
  { value: "active", label: "Activos" },
  { value: "archived", label: "Archivados" },
  { value: "all", label: "Todos" },
];

const columns = createColumnHelper<AdminClassTypeDto>();

const classTypeColumns = (open: (row: AdminClassTypeDto) => void) => [
  columns.accessor("name", {
    header: "Nombre",
    cell: ({ row }) => (
      <span className="flex flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <RowOpener
            label={row.original.name}
            onOpen={() => open(row.original)}
          />
          {row.original.archivedAt === null ? null : (
            <StatusPill tone="neutral">Archivado</StatusPill>
          )}
        </span>
        <span className="text-ayuda text-texto-muy-tenue">
          {row.original.description}
        </span>
      </span>
    ),
  }),
  columns.accessor("durationMinutes", {
    header: "Duración",
    cell: ({ getValue }) => <span className="tabular">{getValue()} min</span>,
  }),
  columns.accessor("defaultCapacity", {
    header: "Capacidad",
    cell: ({ getValue }) => <span className="tabular">{getValue()}</span>,
  }),
  columns.accessor("equipmentNeeds", {
    header: "Equipo necesario",
    cell: ({ getValue }) => (
      <span className="text-texto-secundario">{getValue() ?? "—"}</span>
    ),
  }),
];

// AW06: the Class Types Sessions are scheduled from.
export function ClassTypesPage({
  search,
  onSearchChange,
}: {
  search: CatalogStatusSearch;
  onSearchChange: SearchChange<CatalogStatusSearch>;
}) {
  const query = useQuery(
    classTypeListQueryOptions({
      status: search.status,
      page: search.page,
      pageSize: search.pageSize,
    }),
  );

  return (
    <CatalogPage
      title="Tipos de clase"
      subtitle="Cada sesión del horario se programa desde un tipo de clase."
      createLabel="Nuevo tipo de clase"
      loadingMessage="Cargando tipos de clase…"
      what="los tipos de clase"
      emptyMessage="No hay tipos de clase con este filtro."
      panelTitles={{
        create: "Nuevo tipo de clase",
        edit: "Editar tipo de clase",
      }}
      filter={
        <ListFilter
          label="Estado"
          value={search.status}
          options={statusOptions}
          onChange={(status) => onSearchChange({ status, page: 1 })}
        />
      }
      search={search}
      onPageChange={(page) => onSearchChange({ page })}
      query={query}
      columns={classTypeColumns}
      renderForm={(classType, done) => (
        <ClassTypePanelForm classType={classType} onDone={done} />
      )}
    />
  );
}
