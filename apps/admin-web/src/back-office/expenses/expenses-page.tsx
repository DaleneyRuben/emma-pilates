import type { AdminExpenseDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { CatalogPage, RowOpener } from "../../catalog/catalog-page";
import type { SearchChange } from "../../catalog/catalog-search";
import { NoBranchPage } from "../../components/page/no-branch-page";
import { ListFilter } from "../../components/table/list-filter";
import { pageRangeLabel } from "../../components/table/pagination";
import { formatCivilDate } from "../../lib/bolivia-time";
import { formatBolivianos } from "../../lib/money";
import type { Branch } from "../../shell/branch/branch-context";
import { useBranchSelection } from "../../shell/branch/use-branch-selection";
import { ExpensePanelForm } from "./expense-panel";
import {
  expenseCategoriesQueryOptions,
  expenseTableQueryOptions,
} from "./expense-queries";
import type { ExpenseSearch } from "./expense-search";

const columns = createColumnHelper<AdminExpenseDto>();

const expenseColumns = (open: (row: AdminExpenseDto) => void) => [
  columns.accessor("expenseCategoryName", {
    header: "Categoría",
    cell: ({ row }) => (
      <RowOpener
        label={row.original.expenseCategoryName}
        onOpen={() => open(row.original)}
      />
    ),
  }),
  columns.accessor("amountCentavos", {
    header: "Monto",
    meta: { align: "right" },
    cell: ({ getValue }) => (
      <span className="text-texto tabular">{formatBolivianos(getValue())}</span>
    ),
  }),
  columns.accessor("incurredOn", {
    header: "Fecha",
    cell: ({ getValue }) => (
      <span className="text-texto-secundario tabular">
        {formatCivilDate(getValue())}
      </span>
    ),
  }),
];

function BranchExpenses({
  branch,
  search,
  onSearchChange,
}: {
  branch: Branch;
  search: ExpenseSearch;
  onSearchChange: SearchChange<ExpenseSearch>;
}) {
  const query = useQuery(expenseTableQueryOptions(branch.id, search));
  const categories = useQuery(expenseCategoriesQueryOptions());

  return (
    <CatalogPage
      title="Gastos"
      subtitle={`Sucursal ${branch.name}`}
      createLabel="Nuevo gasto"
      loadingMessage="Cargando gastos…"
      what="los gastos"
      emptyMessage={
        search.expenseCategoryId === undefined
          ? "Todavía no hay gastos en esta sucursal."
          : "No hay gastos de esta categoría en esta sucursal."
      }
      panelTitles={{ create: "Nuevo gasto", edit: "Editar gasto" }}
      filter={
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
        <ExpensePanelForm branch={branch} expense={expense} onDone={done} />
      )}
    />
  );
}

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
