import type { ExpenseReportDto } from "@pilates/api-contracts";
import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { formatMonth } from "../lib/bolivia-time";
import { cn } from "../lib/cn";
import { formatBolivianos, formatSignedBolivianos } from "../lib/money";
import type { ReportMonth } from "./report-range";

// Money sits on the right in tabular figures (design system → tables).
const Amount = ({
  label,
  children,
  strong = false,
}: {
  label: string;
  children: string;
  strong?: boolean;
}) => (
  <TableCell
    data-label={label}
    className={cn(
      "whitespace-nowrap tabular md:text-right",
      strong && "font-medium",
    )}
  >
    <span className="whitespace-nowrap">{children}</span>
  </TableCell>
);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-titulo-panel text-texto">{title}</h2>
      {children}
    </section>
  );
}

const totalRow = "bg-superficie-sutil font-medium hover:bg-superficie-sutil";

/**
 * AW16's breakdown by Expense Category. «Nómina» is its own row, and only
 * in «Todas las sucursales» (follow-up 51, BKO-001 Q3): a Salary Payment is
 * studio-wide, so no single Branch carries it.
 */
export function CategoryTable({
  expenses,
  allBranches,
}: {
  expenses: ExpenseReportDto;
  allBranches: boolean;
}) {
  return (
    <Section title="Gastos por categoría">
      <Table aria-label="Gastos por categoría">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Categoría</TableHead>
            <TableHead className="text-right">Monto total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.totalCentavos === 0 ? (
            <TableRow className="hover:bg-transparent max-md:border-0 max-md:bg-transparent">
              <TableCell
                colSpan={2}
                className="py-8 text-center text-texto-tenue max-md:block max-md:before:content-none"
              >
                Sin gastos en este rango.
              </TableCell>
            </TableRow>
          ) : (
            <>
              {allBranches ? (
                <TableRow>
                  <TableCell data-label="Categoría">
                    <span className="flex flex-col">
                      <span className="font-medium">Nómina</span>
                      <span className="text-ayuda text-texto-tenue">
                        Viene de Nómina, no de las categorías
                      </span>
                    </span>
                  </TableCell>
                  <Amount label="Monto total">
                    {formatBolivianos(expenses.salaryPaymentsCentavos)}
                  </Amount>
                </TableRow>
              ) : null}
              {expenses.byCategory.map((category) => (
                <TableRow key={category.expenseCategoryId}>
                  <TableCell data-label="Categoría">
                    {category.expenseCategoryName}
                  </TableCell>
                  <Amount label="Monto total">
                    {formatBolivianos(category.totalCentavos)}
                  </Amount>
                </TableRow>
              ))}
              <TableRow className={totalRow}>
                <TableCell data-label="">Total de gastos</TableCell>
                <Amount label="Monto total" strong>
                  {formatBolivianos(expenses.totalCentavos)}
                </Amount>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </Section>
  );
}

/** The chart's exact figures, one row per Bolivia month of the range. */
export function MonthTable({ months }: { months: readonly ReportMonth[] }) {
  const sum = (pick: (month: ReportMonth) => number) =>
    months.reduce((total, month) => total + pick(month), 0);
  return (
    <Section title="Totales por mes">
      <Table aria-label="Totales por mes">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Mes</TableHead>
            <TableHead className="text-right">Ingresos</TableHead>
            <TableHead className="text-right">Gastos</TableHead>
            <TableHead className="text-right">Neto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {months.map((month) => (
            <TableRow key={month.month}>
              <TableCell data-label="Mes">
                <span className="whitespace-nowrap">
                  {formatMonth(month.month)}
                </span>
              </TableCell>
              <Amount label="Ingresos">
                {formatBolivianos(month.incomeCentavos)}
              </Amount>
              <Amount label="Gastos">
                {formatBolivianos(month.expensesCentavos)}
              </Amount>
              <Amount label="Neto">
                {formatSignedBolivianos(month.netCentavos)}
              </Amount>
            </TableRow>
          ))}
          <TableRow className={totalRow}>
            <TableCell data-label="">Total del rango</TableCell>
            <Amount label="Ingresos" strong>
              {formatBolivianos(sum((month) => month.incomeCentavos))}
            </Amount>
            <Amount label="Gastos" strong>
              {formatBolivianos(sum((month) => month.expensesCentavos))}
            </Amount>
            <Amount label="Neto" strong>
              {formatSignedBolivianos(sum((month) => month.netCentavos))}
            </Amount>
          </TableRow>
        </TableBody>
      </Table>
    </Section>
  );
}
