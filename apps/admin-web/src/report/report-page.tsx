import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import type { SearchChange } from "../catalog/catalog-search";
import { PageHeader } from "../components/page/page-header";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { ListFilter } from "../components/table/list-filter";
import { useKnownOption } from "../components/table/use-known-option";
import { Input } from "../components/ui/input";
import {
  boliviaMonth,
  boliviaToday,
  formatCivilDate,
} from "../lib/bolivia-time";
import { cn } from "../lib/cn";
import { FinancePanel } from "./finance-panel";
import { MonthChart } from "./month-chart";
import {
  expenseReportQueryOptions,
  incomeReportQueryOptions,
  reportBranchesQueryOptions,
} from "./report-queries";
import { monthTotals, reportMonths } from "./report-range";
import {
  resolveReportRange,
  type ReportRange,
  type ReportSearch,
} from "./report-search";
import { CategoryTable, MonthTable } from "./report-tables";
import { ReportTiles } from "./report-tiles";
import { RevenueSection } from "./revenue-section";
import { VoidedSales } from "./voided-sales";

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={id}
        className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase"
      >
        {label}
      </label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-[34px] w-auto text-nota"
      />
    </div>
  );
}

// The range fields keep what was typed; only an ordered pair reaches the
// address (and the reports).
function RangeFields({
  range,
  onChange,
}: {
  range: ReportRange;
  onChange: (range: ReportRange) => void;
}) {
  const [draft, setDraft] = useState(range);
  const [shown, setShown] = useState(range);
  if (shown.from !== range.from || shown.to !== range.to) {
    setShown(range);
    setDraft(range);
  }
  const backwards = draft.from > draft.to;
  const change = (next: ReportRange) => {
    setDraft(next);
    if (next.from !== "" && next.to !== "" && next.from <= next.to) {
      onChange(next);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-3">
        <DateField
          label="Desde"
          value={draft.from}
          onChange={(from) => change({ ...draft, from })}
        />
        <DateField
          label="Hasta"
          value={draft.to}
          onChange={(to) => change({ ...draft, to })}
        />
      </div>
      {backwards ? (
        <p role="alert" className="text-ayuda text-error-texto">
          La fecha inicial no puede ser posterior a la final.
        </p>
      ) : null}
    </div>
  );
}

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
    <div role="tablist" aria-label="Vistas del reporte" className="flex gap-1">
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
              "rounded-control border px-3 py-1.5 text-nota",
              selected
                ? "border-primario bg-primario-tinte font-medium text-primario-profundo"
                : "border-borde bg-blanco text-texto-secundario",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

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
  const range = resolveReportRange(search, boliviaToday());
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
  const failed = income.isError ? income : expenses.isError ? expenses : null;
  const scope =
    branchId === undefined
      ? "Todas las sucursales"
      : `Sucursal ${branch?.name ?? ""}`.trim();
  const months = reportMonths(range.from, range.to);

  return (
    <article className="flex flex-col gap-5">
      <PageHeader
        title="Reporte de ingresos y gastos"
        subtitle={
          finance
            ? "Caja del mes · Todas las sucursales"
            : `${formatCivilDate(range.from)} – ${formatCivilDate(range.to)} · ${scope}`
        }
        actions={
          finance ? undefined : (
            <div className="flex flex-wrap items-start gap-3">
              <RangeFields
                range={range}
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
        <p className="text-nota text-texto-tenue">
          La nómina y los ingresos por transferencia se ven solo en «Todas las
          sucursales».
        </p>
      )}
      <RevenueSection />
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
          />
          {income.data.totalCentavos === 0 &&
          expenses.data.totalCentavos === 0 ? (
            <p className="rounded-tarjeta border border-borde bg-blanco px-6 py-10 text-center text-cuerpo text-texto-secundario">
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
          <div className="grid gap-5 lg:grid-cols-2">
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
    </article>
  );
}
