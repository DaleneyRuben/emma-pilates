import type { AdminSupplyDto, WithdrawalDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { ChevronLeft } from "lucide-react";
import type { SearchChange } from "../../catalog/catalog-search";
import { NoBranchPage } from "../../components/page/no-branch-page";
import { PageHeader } from "../../components/page/page-header";
import {
  LoadingNotice,
  QueryFailure,
} from "../../components/page/query-failure";
import { DataTable } from "../../components/table/data-table";
import { ListFilter } from "../../components/table/list-filter";
import { MonthStepper } from "../../components/table/month-stepper";
import { countFormat, pageRangeLabel } from "../../components/table/pagination";
import {
  boliviaMonth,
  formatCivilMoment,
  formatMonth,
} from "../../lib/bolivia-time";
import type { Branch } from "../../shell/branch/branch-context";
import { useBranchSelection } from "../../shell/branch/use-branch-selection";
import { unitsLabel } from "./supply-format";
import {
  everySupplyQueryOptions,
  withdrawalHistoryQueryOptions,
} from "./supply-queries";
import type { WithdrawalSearch } from "./supply-search";

const columns = createColumnHelper<WithdrawalDto>();

const withdrawalColumns = [
  columns.accessor("supplyName", {
    header: "Insumo",
    cell: ({ getValue }) => (
      <span className="font-medium text-texto">{getValue()}</span>
    ),
  }),
  columns.accessor("quantity", {
    header: "Cantidad retirada",
    meta: { align: "right" },
    cell: ({ getValue }) => (
      <span className="text-texto tabular">
        {countFormat.format(getValue())}
      </span>
    ),
  }),
  columns.accessor("recordedAt", {
    header: "Fecha",
    cell: ({ getValue }) => (
      <span className="text-texto-secundario tabular">
        {formatCivilMoment(getValue())}
      </span>
    ),
  }),
];

// Active Supplies by name, then the archived ones, whose Withdrawals stay.
const supplyOptions = (supplies: AdminSupplyDto[]) => [
  { value: "all", label: "Todos" },
  ...[...supplies]
    .sort(
      (a, b) =>
        Number(a.archivedAt !== null) - Number(b.archivedAt !== null) ||
        a.name.localeCompare(b.name, "es"),
    )
    .map((supply) => ({
      value: supply.id,
      label:
        supply.archivedAt === null ? supply.name : `${supply.name} (archivado)`,
    })),
];

const summary = (count: number, month: string, supplyName?: string) =>
  `${countFormat.format(count)} ${count === 1 ? "retiro" : "retiros"}${
    supplyName === undefined ? "" : ` de ${supplyName}`
  } en ${formatMonth(month)}.`;

function EmptyHistory() {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto-secundario">Sin retiros en este rango.</span>
      <span className="text-nota text-texto-tenue">
        Prueba con otro mes o con todos los insumos.
      </span>
    </span>
  );
}

function BranchWithdrawals({
  branch,
  search,
  onSearchChange,
}: {
  branch: Branch;
  search: WithdrawalSearch;
  onSearchChange: SearchChange<WithdrawalSearch>;
}) {
  const latest = boliviaMonth();
  const month = search.month ?? latest;
  const query = useQuery(
    withdrawalHistoryQueryOptions(branch.id, month, search),
  );
  const supplies = useQuery(everySupplyQueryOptions(branch.id));
  const supplyName = supplies.data?.items.find(
    (supply) => supply.id === search.supplyId,
  )?.name;

  return (
    <article className="flex flex-col gap-5">
      <Link
        to="/back-office/insumos"
        className="inline-flex items-center gap-1 self-start rounded-control text-nota text-primario hover:text-primario-presionado focus-visible:shadow-foco"
      >
        <ChevronLeft size={14} strokeWidth={1.8} aria-hidden="true" />
        Volver a Insumos
      </Link>
      <PageHeader
        title="Retiros e insumos consumidos"
        subtitle={`Sucursal ${branch.name}`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <MonthStepper
          month={month}
          latest={latest}
          onChange={(next) => onSearchChange({ month: next, page: 1 })}
        />
        <ListFilter
          label="Insumo"
          value={search.supplyId ?? "all"}
          options={supplyOptions(supplies.data?.items ?? [])}
          onChange={(value) =>
            onSearchChange({
              supplyId: value === "all" ? undefined : value,
              page: 1,
            })
          }
        />
      </div>
      {query.isPending ? (
        <LoadingNotice>Cargando retiros…</LoadingNotice>
      ) : query.isError ? (
        <QueryFailure
          error={query.error}
          what="los retiros"
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {query.data.totalItems === 0 ? null : (
            <p className="text-nota text-texto-secundario">
              {summary(query.data.totalItems, month, supplyName)}
            </p>
          )}
          <DataTable
            columns={withdrawalColumns}
            rows={query.data.items}
            rowId={(row) => row.id}
            emptyMessage={<EmptyHistory />}
            pagination={{
              page: search.page,
              pageSize: search.pageSize,
              totalItems: query.data.totalItems,
              onPageChange: (page) => onSearchChange({ page }),
              rangeLabel: (window) =>
                window.totalItems === 0
                  ? pageRangeLabel(window)
                  : `${pageRangeLabel(window)} ${window.totalItems === 1 ? "retiro" : "retiros"}`,
            }}
          />
          {query.data.totals.length === 0 ? null : (
            <section className="flex flex-col gap-1 rounded-control border border-divisor bg-superficie px-3 py-2.5">
              <h2 className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
                Consumo del mes
              </h2>
              <p className="text-nota text-texto tabular">
                {query.data.totals
                  .map(
                    (total) =>
                      `${total.supplyName}: ${unitsLabel(total.quantity)}`,
                  )
                  .join(" · ")}
              </p>
            </section>
          )}
        </>
      )}
    </article>
  );
}

// AW31: the monthly consumption record (back-office/CONTEXT.md, Withdrawal),
// reached only from AW08's link (invariant 6). Nothing here is editable:
// Withdrawals are immutable once logged.
export function WithdrawalsPage({
  search,
  onSearchChange,
}: {
  search: WithdrawalSearch;
  onSearchChange: SearchChange<WithdrawalSearch>;
}) {
  const { selectedBranch, status } = useBranchSelection();
  if (selectedBranch === undefined) {
    return (
      <NoBranchPage
        title="Retiros e insumos consumidos"
        pending={status === "pending"}
        loadingMessage="Cargando retiros…"
        emptyMessage="Todavía no hay sucursales activas."
      />
    );
  }
  return (
    <BranchWithdrawals
      key={selectedBranch.id}
      branch={selectedBranch}
      search={search}
      onSearchChange={onSearchChange}
    />
  );
}
