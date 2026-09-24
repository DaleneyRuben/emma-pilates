import type { AdminBranchDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../../components/page/page-header";
import { isForbidden } from "../../components/page/is-forbidden";
import {
  LoadingNotice,
  QueryFailure,
} from "../../components/page/query-failure";
import { SidePanel } from "../../components/panel/side-panel";
import { DataTable } from "../../components/table/data-table";
import { ListFilter } from "../../components/table/list-filter";
import { Button } from "../../components/ui/button";
import { StatusPill } from "../../components/ui/status-pill";
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

type PanelState = { open: false } | { open: true; branch?: AdminBranchDto };

const columns = createColumnHelper<AdminBranchDto>();

// AW19: the Branches that feed the top-bar selector. A Branch with history
// is never deleted; it can be renamed or archived.
export function BranchesPage({
  search,
  onSearchChange,
}: {
  search: CatalogStatusSearch;
  onSearchChange: SearchChange<CatalogStatusSearch>;
}) {
  const [panel, setPanel] = useState<PanelState>({ open: false });
  const branches = useQuery(branchTableQueryOptions(search));
  const openBranch = (branch: AdminBranchDto) =>
    setPanel({ open: true, branch });

  const tableColumns = [
    columns.accessor("name", {
      header: "Nombre",
      cell: ({ row }) => (
        <span className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openBranch(row.original);
            }}
            className="rounded-control text-left font-medium text-texto hover:text-primario focus-visible:shadow-foco"
          >
            {row.original.name}
          </button>
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

  return (
    <article className="flex flex-col gap-5">
      <PageHeader
        title="Sucursales"
        subtitle="Cada sucursal tiene una sola sala y alimenta el selector de la barra superior."
        actions={
          isForbidden(branches.error) ? undefined : (
            <Button onClick={() => setPanel({ open: true })}>
              <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
              Nueva sucursal
            </Button>
          )
        }
      />
      <ListFilter
        label="Estado"
        value={search.status}
        options={statusOptions}
        onChange={(status) => onSearchChange({ status, page: 1 })}
      />
      {branches.isPending ? (
        <LoadingNotice>Cargando sucursales…</LoadingNotice>
      ) : branches.isError ? (
        <QueryFailure
          error={branches.error}
          what="las sucursales"
          onRetry={() => void branches.refetch()}
        />
      ) : (
        <DataTable
          columns={tableColumns}
          rows={branches.data.items}
          rowId={(branch) => branch.id}
          emptyMessage="No hay sucursales con este filtro."
          onRowClick={openBranch}
          pagination={{
            page: search.page,
            pageSize: search.pageSize,
            totalItems: branches.data.totalItems,
            onPageChange: (page) => onSearchChange({ page }),
          }}
        />
      )}
      <SidePanel
        open={panel.open}
        onOpenChange={(open) => {
          if (!open) setPanel({ open: false });
        }}
        title={
          panel.open && panel.branch !== undefined
            ? "Editar sucursal"
            : "Nueva sucursal"
        }
      >
        {panel.open ? (
          <BranchPanelForm
            key={panel.branch?.id ?? "new"}
            branch={panel.branch}
            onDone={() => setPanel({ open: false })}
          />
        ) : null}
      </SidePanel>
    </article>
  );
}
