import type { AdminSupplyDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { CatalogPage, RowOpener } from "../../catalog/catalog-page";
import type { SearchChange } from "../../catalog/catalog-search";
import { NoBranchPage } from "../../components/page/no-branch-page";
import {
  countFormat,
  pageRangeLabel,
  type ListSearch,
} from "../../components/table/pagination";
import { Button } from "../../components/ui/button";
import { StatusPill } from "../../components/ui/status-pill";
import type { Branch } from "../../shell/branch/branch-context";
import { useBranchSelection } from "../../shell/branch/use-branch-selection";
import { SupplyPanelForm } from "./supply-panel";
import { supplyTableQueryOptions } from "./supply-queries";

const columns = createColumnHelper<AdminSupplyDto>();

const supplyColumns = (open: (row: AdminSupplyDto) => void) => [
  columns.accessor("name", {
    header: "Nombre",
    cell: ({ row }) => (
      <RowOpener label={row.original.name} onOpen={() => open(row.original)} />
    ),
  }),
  columns.accessor("quantityOnHand", {
    header: "Cantidad en stock",
    meta: { align: "right" },
    cell: ({ getValue }) => (
      <span className="text-texto tabular">
        {countFormat.format(getValue())}
      </span>
    ),
  }),
  // At or below the threshold (BKO-001 D8); nothing otherwise.
  columns.accessor("lowStock", {
    header: "Estado",
    cell: ({ getValue }) =>
      getValue() ? (
        <StatusPill tone="advertencia">Stock bajo</StatusPill>
      ) : null,
  }),
];

const lowStockLine = (branch: Branch, count: number | undefined) =>
  count === undefined
    ? `Sucursal ${branch.name}`
    : count === 0
      ? `Sucursal ${branch.name} · ningún insumo con stock bajo`
      : `Sucursal ${branch.name} · ${countFormat.format(count)} con stock bajo`;

function EmptySupplies() {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto-secundario">
        Todavía no hay insumos en esta sucursal.
      </span>
      <span className="text-nota text-texto-tenue">
        Crea el primero con «Nuevo insumo».
      </span>
    </span>
  );
}

function BranchSupplies({
  branch,
  search,
  onSearchChange,
}: {
  branch: Branch;
  search: ListSearch;
  onSearchChange: SearchChange<ListSearch>;
}) {
  const query = useQuery(supplyTableQueryOptions(branch.id, search));

  return (
    <CatalogPage
      title="Insumos"
      subtitle={lowStockLine(branch, query.data?.lowStockCount)}
      createLabel="Nuevo insumo"
      loadingMessage="Cargando insumos…"
      what="los insumos"
      emptyMessage={<EmptySupplies />}
      panelTitles={{ create: "Nuevo insumo", edit: "Editar insumo" }}
      filter={null}
      search={search}
      onPageChange={(page) => onSearchChange({ page })}
      rangeLabel={(window) =>
        window.totalItems === 0
          ? pageRangeLabel(window)
          : `${pageRangeLabel(window)} ${window.totalItems === 1 ? "insumo" : "insumos"}`
      }
      query={query}
      columns={supplyColumns}
      renderForm={(supply, done) => (
        <SupplyPanelForm branchId={branch.id} supply={supply} onDone={done} />
      )}
      panelActions={[
        { label: "Registrar retiro", render: () => null },
        { label: "Registrar reposición", render: () => null },
      ]}
      links={
        <Button asChild variant="link" className="px-2">
          <Link to="/back-office/insumos/retiros">
            Ver historial de retiros
          </Link>
        </Button>
      }
    />
  );
}

// AW08 with follow-ups 07 and 48: the selected Branch's consumables. Stock
// changes only through Withdrawals and Restocks (back-office/CONTEXT.md).
export function SuppliesPage({
  search,
  onSearchChange,
}: {
  search: ListSearch;
  onSearchChange: SearchChange<ListSearch>;
}) {
  const { selectedBranch, status } = useBranchSelection();
  if (selectedBranch === undefined) {
    return (
      <NoBranchPage
        title="Insumos"
        pending={status === "pending"}
        loadingMessage="Cargando insumos…"
        emptyMessage="Todavía no hay sucursales activas. Crea una en Sucursales para llevar sus insumos."
      />
    );
  }
  return (
    <BranchSupplies
      key={selectedBranch.id}
      branch={selectedBranch}
      search={search}
      onSearchChange={onSearchChange}
    />
  );
}
