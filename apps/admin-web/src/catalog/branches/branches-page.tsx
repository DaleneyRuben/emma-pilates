import type { AdminBranchDto } from "@pilates/api-contracts";
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
import { BranchPanelForm } from "./branch-panel";
import { branchTableQueryOptions } from "./branch-queries";

const statusOptions: { value: CatalogStatus; label: string }[] = [
  { value: "active", label: "Activas" },
  { value: "archived", label: "Archivadas" },
  { value: "all", label: "Todas" },
];

const columns = createColumnHelper<AdminBranchDto>();

const branchColumns = (open: (row: AdminBranchDto) => void) => [
  columns.accessor("name", {
    header: "Nombre",
    cell: ({ row }) => (
      <span className="flex flex-wrap items-center gap-2">
        <RowOpener
          label={row.original.name}
          onOpen={() => open(row.original)}
        />
        {row.original.archivedAt === null ? null : (
          <StatusPill tone="neutral">Archivada</StatusPill>
        )}
      </span>
    ),
  }),
  columns.accessor("address", {
    header: "Dirección",
    cell: ({ getValue }) => (
      <span className="text-texto-secundario">{getValue()}</span>
    ),
  }),
];

// AW19: the Branches that feed the top-bar selector. A Branch with history
// is never deleted; it can be renamed or archived.
export function BranchesPage({
  search,
  onSearchChange,
}: {
  search: CatalogStatusSearch;
  onSearchChange: SearchChange<CatalogStatusSearch>;
}) {
  const query = useQuery(branchTableQueryOptions(search));

  return (
    <CatalogPage
      title="Sucursales"
      subtitle="Cada sucursal tiene una sola sala y alimenta el selector de la barra superior."
      createLabel="Nueva sucursal"
      loadingMessage="Cargando sucursales…"
      what="las sucursales"
      emptyMessage="No hay sucursales con este filtro."
      panelTitles={{ create: "Nueva sucursal", edit: "Editar sucursal" }}
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
      columns={branchColumns}
      renderForm={(branch, done) => (
        <BranchPanelForm branch={branch} onDone={done} />
      )}
    />
  );
}
