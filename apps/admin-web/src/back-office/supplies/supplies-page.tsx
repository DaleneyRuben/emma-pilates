import type { AdminSupplyDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import {
  CatalogPage,
  RowOpener,
  type PanelAction,
} from "../../catalog/catalog-page";
import type { SearchChange } from "../../catalog/catalog-search";
import { NoBranchPage } from "../../components/page/no-branch-page";
import {
  countFormat,
  pageRangeLabel,
  type ListSearch,
} from "../../components/table/pagination";
import { StatusPill } from "../../components/ui/status-pill";
import { useAdminRole } from "../../session/admin-role";
import type { Branch } from "../../shell/branch/branch-context";
import { useBranchSelection } from "../../shell/branch/use-branch-selection";
import { SupplyMovementForm } from "./movement-panel";
import { SupplyPanelForm } from "./supply-panel";
import { supplyTableQueryOptions } from "./supply-queries";

const columns = createColumnHelper<AdminSupplyDto>();

// The Coordinator records movements but never edits a Supply (ADR-0108), so
// her rows name the Supply without opening it.
const movementAction = (
  branchId: string,
  kind: "withdrawal" | "restock",
  supply: AdminSupplyDto,
): PanelAction => ({
  label: kind === "withdrawal" ? "Registrar retiro" : "Registrar reposición",
  render: (done) => (
    <SupplyMovementForm
      branchId={branchId}
      kind={kind}
      supplyId={supply.id}
      onDone={done}
    />
  ),
});

// FIX-090: 44 px targets, apart, so a phone tap lands on the one meant.
const rowLink =
  "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-control px-2 text-celda font-medium text-primario-profundo hover:text-primario-presionado focus-visible:shadow-foco disabled:text-deshabilitado-texto";

const supplyColumns =
  (branchId: string, managesCatalog: boolean) =>
  (open: (row: AdminSupplyDto) => void, act: (action: PanelAction) => void) => [
    columns.accessor("name", {
      header: "Nombre",
      cell: ({ row }) =>
        managesCatalog ? (
          <RowOpener
            label={row.original.name}
            onOpen={() => open(row.original)}
          />
        ) : (
          <span className="font-medium text-texto">{row.original.name}</span>
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
        ) : (
          <span className="text-texto-tenue">Suficiente</span>
        ),
    }),
    // FIX-088 (Insumos B): each row logs its own Withdrawal or Restock.
    columns.display({
      id: "actions",
      header: "",
      meta: { align: "right" },
      cell: ({ row }) => (
        <span className="inline-flex gap-3">
          {(["withdrawal", "restock"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-label={`${kind === "withdrawal" ? "Registrar retiro" : "Registrar reposición"} de ${row.original.name}`}
              // Nothing to withdraw from an empty Supply.
              disabled={
                kind === "withdrawal" && row.original.quantityOnHand <= 0
              }
              className={rowLink}
              onClick={(event) => {
                event.stopPropagation();
                act(movementAction(branchId, kind, row.original));
              }}
            >
              {kind === "withdrawal" ? "Retiro" : "Reposición"}
            </button>
          ))}
        </span>
      ),
    }),
  ];

const lowStockLine = (branch: Branch, count: number | undefined) =>
  count === undefined
    ? `Sucursal ${branch.name}`
    : count === 0
      ? `Sucursal ${branch.name} · ningún insumo con stock bajo`
      : `Sucursal ${branch.name} · ${countFormat.format(count)} con stock bajo`;

function EmptySupplies({ managesCatalog }: { managesCatalog: boolean }) {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto-secundario">
        Todavía no hay insumos en esta sucursal.
      </span>
      {managesCatalog ? (
        <span className="text-nota text-texto-tenue">
          Crea el primero con «Nuevo insumo».
        </span>
      ) : null}
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
  const managesCatalog = useAdminRole() === "administrator";

  return (
    <CatalogPage
      title="Insumos"
      subtitle={lowStockLine(branch, query.data?.lowStockCount)}
      createLabel={managesCatalog ? "Nuevo insumo" : undefined}
      loadingMessage="Cargando insumos…"
      what="los insumos"
      emptyMessage={<EmptySupplies managesCatalog={managesCatalog} />}
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
      columns={supplyColumns(branch.id, managesCatalog)}
      canOpen={() => managesCatalog}
      renderForm={(supply, done) => (
        <SupplyPanelForm branchId={branch.id} supply={supply} onDone={done} />
      )}
    />
  );
}

// AW08 with follow-ups 07 and 48: the selected Branch's consumables. FIX-088
// (Insumos B): only «Nuevo insumo» in the header; the history is Movimientos. Stock
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
