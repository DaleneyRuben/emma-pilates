import { formatDateTime, formatListDate } from "@pilates/api-contracts";
import type { AdminExpenseDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { CatalogPage, RowOpener } from "../../catalog/catalog-page";
import type { SearchChange } from "../../catalog/catalog-search";
import { NoBranchPage } from "../../components/page/no-branch-page";
import { ListFilter } from "../../components/table/list-filter";
import { MonthStepper } from "../../components/table/month-stepper";
import { pageRangeLabel } from "../../components/table/pagination";
import { useKnownOption } from "../../components/table/use-known-option";
import { Pencil } from "lucide-react";
import { Button } from "../../components/ui/button";
import { StatusPill } from "../../components/ui/status-pill";
import { boliviaMonth, formatMonth } from "../../lib/bolivia-time";
import { cn } from "../../lib/cn";
import { formatBolivianos } from "../../lib/money";
import type { Branch } from "../../shell/branch/branch-context";
import { useBranchSelection } from "../../shell/branch/use-branch-selection";
import { ExpensePanelForm } from "./expense-panel";
import {
  expenseCategoriesQueryOptions,
  expenseTableQueryOptions,
} from "./expense-queries";
import type { ExpenseSearch } from "./expense-search";
import { ExpenseCategoriesEditor } from "./categories-page";
import { ExpenseMonthTotals } from "./expense-month-totals";

const columns = createColumnHelper<AdminExpenseDto>();

const isVoided = (expense: AdminExpenseDto) => expense.voidedAt !== null;

// Finding 104: an eliminated Expense is listed muted, with who and when;
// FIX-091 lists it only under the month's «Ver gastos borrados».
const voidedLine = (expense: AdminExpenseDto) =>
  [
    expense.voidedByName === null || expense.voidedByName === ""
      ? "Eliminado"
      : `Eliminado por ${expense.voidedByName}`,
    formatDateTime(expense.voidedAt ?? ""),
    ...(expense.voidReason === null ? [] : [expense.voidReason]),
  ].join(" · ");

// FIX-091 (W11 B): date, category and amount, in that order; W11 A puts
// the detail between the category and the amount.
const expenseColumns = (open: (row: AdminExpenseDto) => void) => [
  columns.accessor("incurredOn", {
    header: "Fecha",
    // A phone card still leads with the category.
    meta: { card: "detail" },
    cell: ({ getValue }) => (
      <span className="text-texto-secundario tabular">
        {formatListDate(getValue())}
      </span>
    ),
  }),
  columns.accessor("expenseCategoryName", {
    header: "Categoría",
    meta: { card: "title" },
    cell: ({ row }) =>
      isVoided(row.original) ? (
        <span className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-texto-tenue">
              {row.original.expenseCategoryName}
            </span>
            <StatusPill tone="neutral">Eliminado</StatusPill>
          </span>
          <span className="text-nota text-texto-tenue">
            {voidedLine(row.original)}
          </span>
        </span>
      ) : (
        <RowOpener
          label={row.original.expenseCategoryName}
          onOpen={() => open(row.original)}
        />
      ),
  }),
  columns.accessor("detail", {
    header: "Detalle",
    cell: ({ row, getValue }) => {
      const detail = getValue();
      return detail === null ? (
        <span className="text-texto-tenue">—</span>
      ) : (
        <span
          className={cn(
            isVoided(row.original) ? "text-texto-tenue" : "text-texto",
          )}
        >
          {detail}
        </span>
      );
    },
  }),
  columns.accessor("amountCentavos", {
    header: "Monto",
    meta: { align: "right" },
    cell: ({ row, getValue }) => (
      <span
        className={cn(
          "tabular",
          isVoided(row.original)
            ? "text-texto-tenue line-through"
            : "text-texto",
        )}
      >
        {formatBolivianos(getValue())}
      </span>
    ),
  }),
  // Finding 104: the row says it opens «Editar gasto» (owner, 2026-11-18).
  columns.display({
    id: "edit",
    header: "",
    meta: { align: "right" },
    cell: ({ row }) =>
      isVoided(row.original) ? null : (
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Editar el gasto de ${row.original.expenseCategoryName}`}
          onClick={(event) => {
            event.stopPropagation();
            open(row.original);
          }}
        >
          <Pencil size={14} strokeWidth={1.8} aria-hidden="true" />
          Editar
        </Button>
      ),
  }),
];

const emptyMessage = (search: ExpenseSearch, month: string) =>
  search.borrados === true
    ? `No hay gastos borrados en ${formatMonth(month)}.`
    : search.expenseCategoryId === undefined
      ? `No hay gastos en ${formatMonth(month)}.`
      : `No hay gastos de esta categoría en ${formatMonth(month)}.`;

function BranchExpenses({
  branch,
  search,
  onSearchChange,
}: {
  branch: Branch;
  search: ExpenseSearch;
  onSearchChange: SearchChange<ExpenseSearch>;
}) {
  const latest = boliviaMonth();
  const month = search.month ?? latest;
  const query = useQuery(expenseTableQueryOptions(branch.id, month, search));
  const categories = useQuery(expenseCategoriesQueryOptions());
  useKnownOption(search.expenseCategoryId, categories.data, () =>
    onSearchChange({ expenseCategoryId: undefined, page: 1 }),
  );
  const showEliminated = (show: boolean) =>
    onSearchChange({ borrados: show ? true : undefined, page: 1 });

  return (
    <CatalogPage
      title="Gastos"
      subtitle={`Sucursal ${branch.name}`}
      createLabel="Nuevo gasto"
      loadingMessage="Cargando gastos…"
      what="los gastos"
      emptyMessage={emptyMessage(search, month)}
      panelTitles={{ create: "Nuevo gasto", edit: "Editar gasto" }}
      canOpen={(expense) => !isVoided(expense)}
      panelActions={categoriesAction}
      filter={
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <MonthStepper
              month={month}
              latest={latest}
              onChange={(next) => onSearchChange({ month: next, page: 1 })}
            />
            <ListFilter
              label="Categoría"
              value={search.expenseCategoryId ?? "all"}
              options={[
                { value: "all", label: "Todas" },
                ...(categories.data ?? []).map((category) => ({
                  value: category.id,
                  label: category.name,
                })),
              ]}
              onChange={(value) =>
                onSearchChange({
                  expenseCategoryId: value === "all" ? undefined : value,
                  page: 1,
                })
              }
            />
          </div>
          {search.borrados === true ? (
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-serif text-titulo-2 text-texto">
                Gastos borrados de {formatMonth(month)}
              </h2>
              <Button variant="link" onClick={() => showEliminated(false)}>
                Volver a los gastos
              </Button>
            </div>
          ) : null}
        </div>
      }
      aside={
        <ExpenseMonthTotals
          branchId={branch.id}
          month={month}
          showingEliminated={search.borrados === true}
          onShowEliminated={showEliminated}
        />
      }
      search={search}
      onPageChange={(page) => onSearchChange({ page })}
      rangeLabel={(window) =>
        window.totalItems === 0
          ? pageRangeLabel(window)
          : `${pageRangeLabel(window)} ${window.totalItems === 1 ? "gasto" : "gastos"}`
      }
      query={query}
      columns={expenseColumns}
      renderForm={(expense, done) => (
        <ExpensePanelForm
          branch={branch}
          expense={expense}
          onDone={done}
          onSavedOn={(incurredOn) => {
            // A date in another month would leave the new row out of sight.
            const saved = incurredOn.slice(0, 7);
            if (saved !== month) {
              onSearchChange({ month: saved, borrados: undefined, page: 1 });
            }
          }}
        />
      )}
    />
  );
}

const categoriesAction = [
  { label: "Editar categorías", render: () => <ExpenseCategoriesEditor /> },
];

// AW13: the selected Branch's recorded costs, each in one Expense Category.
export function ExpensesPage({
  search,
  onSearchChange,
}: {
  search: ExpenseSearch;
  onSearchChange: SearchChange<ExpenseSearch>;
}) {
  const { selectedBranch, status } = useBranchSelection();
  if (selectedBranch === undefined) {
    return (
      <NoBranchPage
        title="Gastos"
        pending={status === "pending"}
        loadingMessage="Cargando gastos…"
        emptyMessage="Todavía no hay sucursales activas. Crea una en Sucursales para registrar sus gastos."
      />
    );
  }
  return (
    <BranchExpenses
      key={selectedBranch.id}
      branch={selectedBranch}
      search={search}
      onSearchChange={onSearchChange}
    />
  );
}
