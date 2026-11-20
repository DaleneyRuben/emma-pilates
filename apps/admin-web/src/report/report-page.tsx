import { formatListDate } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import type { SearchChange } from "../catalog/catalog-search";
import { PageHeader } from "../components/page/page-header";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { ListFilter } from "../components/table/list-filter";
import { useKnownOption } from "../components/table/use-known-option";
import { boliviaMonth, boliviaToday } from "../lib/bolivia-time";
import {
  segmentClass,
  segmentCurrentClass,
  segmentedBarClass,
} from "../components/ui/segmented";
import { cn } from "../lib/cn";
import { FinancePanel } from "./finance-panel";
import { monthResultQueryOptions } from "./finance-queries";
import { MonthChart } from "./month-chart";
import {
  expenseReportQueryOptions,
  incomeReportQueryOptions,
  reportBranchesQueryOptions,
} from "./report-queries";
import { ComparisonTable } from "./report-comparison";
import { useMonthComparison } from "./use-month-comparison";
import { ReportPeriodPicker } from "./report-period-picker";
import { monthTotals, reportMonths } from "./report-range";
import { resolveReportRange, type ReportSearch } from "./report-search";
import { CategoryTable, MonthTable } from "./report-tables";
import { ReportTiles } from "./report-tiles";
import { RevenueSection } from "./revenue-section";
import { VoidedSales } from "./voided-sales";

function ReportTabs({
  vista,
  onChange,
}: {
  vista: ReportSearch["vista"];
  onChange: (vista: ReportSearch["vista"]) => void;
}) {
  const tabs = [
    { value: "reporte", label: "Reporte" },
    { value: "finanzas", label: "Finanzas" },
  ] as const;
  return (
    <div
      role="tablist"
      aria-label="Vistas del reporte"
      className={segmentedBarClass}
    >
      {tabs.map((tab) => {
        const selected = vista === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={cn(
              segmentClass,
              "h-9 px-3.5 text-celda",
              selected && segmentCurrentClass,
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// FIX-091 (W5 B): Entró, Salió and Quedó, then the month against the month
// before, the chart, the tables of the range, and the month's accrued revenue.
// AW16: confirmed income (Booking & Membership) against Expenses and Salary
// Payments (Back Office) for a Bolivia date range, for every Branch or one.
// Its own selector adds «Todas las sucursales» (the shell's is replaced).
export function ReportPage({
  search,
  onSearchChange,
}: {
  search: ReportSearch;
  onSearchChange: SearchChange<ReportSearch>;
}) {
  const today = boliviaToday();
  const range = resolveReportRange(search, today);
  const finance = search.vista === "finanzas";
  const branches = useQuery(reportBranchesQueryOptions());
  const branchId = search.branch === "all" ? undefined : search.branch;
  const branch = branches.data?.find((option) => option.id === branchId);
  // An address naming a Branch the studio does not have falls back to every
  // Branch, instead of a report headed «Sucursal» with no name.
  useKnownOption(branchId, branches.data, () =>
    onSearchChange({ branch: "all" }),
  );
  const income = useQuery({
    ...incomeReportQueryOptions(range, branchId),
    enabled: !finance,
  });
  const expenses = useQuery({
    ...expenseReportQueryOptions(range, branchId),
    enabled: !finance,
  });
  const comparison = useMonthComparison(range, branchId, !finance);
  // Quedó's break-even is the whole studio's, for the month the range ends in.
  const breakEven = useQuery({
    ...monthResultQueryOptions(range.to.slice(0, 7)),
    enabled: !finance && branchId === undefined,
  });
  const failed = income.isError ? income : expenses.isError ? expenses : null;
  const scope =
    branchId === undefined
      ? "Todas las sucursales"
      : `Sucursal ${branch?.name ?? ""}`.trim();
  const months = reportMonths(range.from, range.to);

  return (
    <article className="flex flex-col gap-5">
      <PageHeader
        title="Dinero"
        subtitle={
          finance
            ? "Caja del mes · Todas las sucursales"
            : `${formatListDate(range.from)} – ${formatListDate(range.to)} · ${scope}`
        }
        actions={
          finance ? undefined : (
            <div className="flex flex-wrap items-start gap-3">
              <ReportPeriodPicker
                range={range}
                today={today}
                onChange={(next) => onSearchChange(next)}
              />
              <ListFilter
                label="Sucursal"
                value={search.branch}
                options={[
                  { value: "all", label: "Todas las sucursales" },
                  ...(branches.data ?? []).map((option) => ({
                    value: option.id,
                    label:
                      option.archivedAt === null
                        ? option.name
                        : `${option.name} (archivada)`,
                  })),
                ]}
                onChange={(value) => onSearchChange({ branch: value })}
              />
            </div>
          )
        }
      />
      <ReportTabs
        vista={search.vista}
        onChange={(vista) => onSearchChange({ vista })}
      />
      {finance ? (
        <div role="tabpanel" aria-label="Finanzas">
          <FinancePanel
            month={search.month ?? boliviaMonth()}
            onMonthChange={(month) => onSearchChange({ month })}
          />
        </div>
      ) : null}
      {finance || branchId === undefined ? null : (
        <p className="text-nota text-texto">
          La nómina y los ingresos por QR se ven solo en «Todas las sucursales».
        </p>
      )}
      {finance ? null : failed !== null ? (
        <QueryFailure
          error={failed.error}
          what="el reporte"
          onRetry={() => {
            void income.refetch();
            void expenses.refetch();
          }}
        />
      ) : income.data === undefined || expenses.data === undefined ? (
        <LoadingNotice>Cargando el reporte…</LoadingNotice>
      ) : (
        <>
          <VoidedSales sales={income.data.voided} />
          <ReportTiles
            income={income.data}
            expenses={expenses.data}
            branchName={
              branchId === undefined ? undefined : (branch?.name ?? "")
            }
            change={comparison.change}
            finance={breakEven.data}
          />
          <ComparisonTable
            comparison={comparison}
            allBranches={branchId === undefined}
          />
          {income.data.totalCentavos === 0 &&
          expenses.data.totalCentavos === 0 ? (
            <p className="rounded-tarjeta bg-superficie shadow-tarjeta px-6 py-10 text-center text-cuerpo text-texto">
              Sin ingresos ni gastos en este rango.
            </p>
          ) : (
            <MonthChart
              months={monthTotals(
                months,
                income.data.months,
                expenses.data.months,
              )}
            />
          )}
          <div className="grid gap-5 min-[1100px]:grid-cols-2">
            <CategoryTable
              expenses={expenses.data}
              allBranches={branchId === undefined}
            />
            <MonthTable
              months={monthTotals(
                months,
                income.data.months,
                expenses.data.months,
              )}
            />
          </div>
        </>
      )}
      <RevenueSection
        month={range.to.slice(0, 7)}
        active={search.vista !== undefined && !finance}
        branchName={branchId === undefined ? undefined : (branch?.name ?? "")}
      />
    </article>
  );
}
