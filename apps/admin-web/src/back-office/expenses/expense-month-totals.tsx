import { useQuery } from "@tanstack/react-query";
import {
  LoadingNotice,
  QueryFailure,
} from "../../components/page/query-failure";
import { Button } from "../../components/ui/button";
import { formatMonth } from "../../lib/bolivia-time";
import { formatBolivianos } from "../../lib/money";
import { expenseReportQueryOptions } from "../../report/report-queries";
import { monthRange } from "./expense-queries";

const monthName = (month: string) => {
  const name = formatMonth(month).split(" ")[0] ?? "";
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
};

/**
 * FIX-091 (W11 B): the month's standing Expenses totalled per category,
 * beside the table, read from AW16's expense report for the Branch (an
 * eliminated Expense counts for nothing). Its link swaps the table for the
 * month's eliminated Expenses and back.
 */
export function ExpenseMonthTotals({
  branchId,
  month,
  showingEliminated,
  onShowEliminated,
}: {
  branchId: string;
  month: string;
  showingEliminated: boolean;
  onShowEliminated: (show: boolean) => void;
}) {
  const report = useQuery(
    expenseReportQueryOptions(monthRange(month), branchId),
  );

  // Rosa Emma (RW-gastos), follow-up 285: the month's total is the 600
  // block beside the table, white on Rosa profundo.
  return (
    <section
      aria-label={`Total de ${formatMonth(month)}`}
      className="flex flex-col gap-3 rounded-tarjeta bg-destacado px-4 py-3.5 text-sobre-primario shadow-destacado"
    >
      <h2 className="tipo-etiqueta">{monthName(month)}</h2>
      {report.isPending ? (
        <LoadingNotice>Sumando el mes…</LoadingNotice>
      ) : report.isError ? (
        <QueryFailure
          error={report.error}
          what="el total del mes"
          onRetry={() => void report.refetch()}
        />
      ) : (
        <>
          <p className="tipo-cifra-grande whitespace-nowrap">
            {formatBolivianos(report.data.expensesCentavos)}
          </p>
          {report.data.byCategory.length === 0 ? (
            <p className="tipo-compacto">Sin gastos este mes.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-rosa-200 rounded-control border border-rosa-200">
              {report.data.byCategory.map((line) => (
                <li
                  key={line.expenseCategoryId}
                  className="flex items-center justify-between gap-3 px-3 py-2 tipo-compacto"
                >
                  <span>{line.expenseCategoryName}</span>
                  <span className="whitespace-nowrap tabular">
                    {formatBolivianos(line.totalCentavos)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <Button
        variant="link"
        className="self-start text-sobre-primario"
        onClick={() => onShowEliminated(!showingEliminated)}
      >
        {showingEliminated ? "Volver a los gastos" : "Ver gastos borrados"}
      </Button>
    </section>
  );
}
