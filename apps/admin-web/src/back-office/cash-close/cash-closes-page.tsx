import type { CashCloseHistoryDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import type { SearchChange } from "../../catalog/catalog-search";
import { NoBranchPage } from "../../components/page/no-branch-page";
import { PageHeader } from "../../components/page/page-header";
import {
  LoadingNotice,
  QueryFailure,
} from "../../components/page/query-failure";
import { DataTable } from "../../components/table/data-table";
import { MonthStepper } from "../../components/table/month-stepper";
import { boliviaMonth } from "../../lib/bolivia-time";
import type { Branch } from "../../shell/branch/branch-context";
import { useBranchSelection } from "../../shell/branch/use-branch-selection";
import { cashDayColumns, cashDayRowProps } from "./cash-close-columns";
import { cashCloseHistoryQueryOptions } from "./cash-close-queries";
import type { CashCloseSearch } from "./cash-close-search";

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

const summary = (history: CashCloseHistoryDto): string => {
  const sold = history.days.filter((day) => day.cashPaymentCount > 0).length;
  const closed = history.days.filter((day) => day.status === "closed").length;
  return [
    plural(sold, "día con ventas en efectivo", "días con ventas en efectivo"),
    plural(closed, "cerrado", "cerrados"),
    `${history.missingDays} sin cierre`,
  ].join(" · ");
};

function MissingNotice({ count }: { count: number }) {
  return (
    <section
      role="status"
      className="flex flex-col gap-0.5 rounded-control border border-advertencia/40 bg-advertencia/10 px-3 py-2.5"
    >
      <p className="text-cuerpo font-medium text-advertencia-texto">
        {`${plural(count, "día", "días")} con ventas en efectivo sin cierre`}
      </p>
      <p className="text-nota text-texto-secundario">
        Revisa con recepción qué pasó esos días.
      </p>
    </section>
  );
}

function EmptyMonth() {
  return (
    <span className="flex flex-col items-center gap-1">
      <span className="text-texto-secundario">
        No hubo ventas en efectivo ni cierres en este mes.
      </span>
      <span className="text-nota text-texto-tenue">
        Prueba con otro mes o con otra sucursal.
      </span>
    </span>
  );
}

function BranchCashCloses({
  branch,
  search,
  onSearchChange,
}: {
  branch: Branch;
  search: CashCloseSearch;
  onSearchChange: SearchChange<CashCloseSearch>;
}) {
  const latest = boliviaMonth();
  const month = search.month ?? latest;
  const query = useQuery(cashCloseHistoryQueryOptions(branch.id, month));

  return (
    <article className="flex flex-col gap-5">
      <PageHeader
        title="Cierres de caja"
        subtitle={`Sucursal ${branch.name}`}
      />
      <MonthStepper
        month={month}
        latest={latest}
        onChange={(next) => onSearchChange({ month: next })}
      />
      {query.isPending ? (
        <LoadingNotice>Cargando cierres de caja…</LoadingNotice>
      ) : query.isError ? (
        <QueryFailure
          error={query.error}
          what="los cierres de caja"
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {query.data.missingDays === 0 ? null : (
            <MissingNotice count={query.data.missingDays} />
          )}
          <DataTable
            columns={cashDayColumns}
            rows={query.data.days}
            rowId={(day) => day.businessDate}
            rowProps={cashDayRowProps}
            emptyMessage={<EmptyMonth />}
          />
          {query.data.days.length === 0 ? null : (
            <p className="text-nota text-texto-secundario tabular">
              {summary(query.data)}
            </p>
          )}
        </>
      )}
    </article>
  );
}

// AW151: the Administrator's review of the daily Cash Closes (BKO-003). Read
// only: closes are made in the Staff app (S25) and never edited.
export function CashClosesPage({
  search,
  onSearchChange,
}: {
  search: CashCloseSearch;
  onSearchChange: SearchChange<CashCloseSearch>;
}) {
  const { selectedBranch, status } = useBranchSelection();
  if (selectedBranch === undefined) {
    return (
      <NoBranchPage
        title="Cierres de caja"
        pending={status === "pending"}
        loadingMessage="Cargando cierres de caja…"
        emptyMessage="Todavía no hay sucursales activas."
      />
    );
  }
  return (
    <BranchCashCloses
      key={selectedBranch.id}
      branch={selectedBranch}
      search={search}
      onSearchChange={onSearchChange}
    />
  );
}
