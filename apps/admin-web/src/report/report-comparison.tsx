import { QueryFailure } from "../components/page/query-failure";
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
import type { MonthComparison, MonthReport } from "./use-month-comparison";

type Concept = {
  name: string;
  amount: (report: MonthReport) => number;
  signed?: boolean;
  total?: boolean;
};

const concepts = (allBranches: boolean): Concept[] => [
  { name: "Planes vendidos", amount: (report) => report.income.byKind.plan },
  {
    name: "Evaluaciones",
    amount: (report) => report.income.byKind.evaluation,
  },
  {
    name: "Entró",
    amount: (report) => report.income.totalCentavos,
    total: true,
  },
  // A Salary Payment is studio-wide, so no single Branch carries it.
  ...(allBranches
    ? [
        {
          name: "Sueldos",
          amount: (report: MonthReport) =>
            report.expenses.salaryPaymentsCentavos,
        },
      ]
    : []),
  {
    name: "Gastos del estudio",
    amount: (report) => report.expenses.expensesCentavos,
  },
  {
    name: "Salió",
    amount: (report) => report.expenses.totalCentavos,
    total: true,
  },
  {
    name: "Quedó",
    amount: (report) =>
      report.income.totalCentavos - report.expenses.totalCentavos,
    signed: true,
    total: true,
  },
];

const totalRow =
  "bg-superficie-hundida tipo-titulo-fila hover:bg-superficie-hundida";

export function ComparisonTable({
  comparison,
  allBranches,
}: {
  comparison: MonthComparison;
  allBranches: boolean;
}) {
  if (comparison.error !== null) {
    return (
      <QueryFailure
        error={comparison.error}
        what="la comparación con el mes anterior"
        onRetry={comparison.retry}
      />
    );
  }
  if (comparison.pair === undefined) return null;
  const reports = comparison.pair;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="tipo-titulo-seccion text-texto">Mes contra mes</h2>
      <Table aria-label="Mes contra mes">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Concepto</TableHead>
            {reports.map((report) => (
              <TableHead key={report.month.month} className="text-right">
                {formatMonth(report.month.month)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {concepts(allBranches).map((concept) => (
            <TableRow
              key={concept.name}
              className={cn(concept.total && totalRow)}
            >
              {/* At phone width the concept is the card's title, not a labelled line. */}
              <TableCell className="max-md:tipo-titulo-fila max-md:before:content-none">
                {concept.name}
              </TableCell>
              {reports.map((report) => (
                <TableCell
                  key={report.month.month}
                  data-label={formatMonth(report.month.month)}
                  className="whitespace-nowrap tabular md:text-right"
                >
                  {(concept.signed ? formatSignedBolivianos : formatBolivianos)(
                    concept.amount(report),
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
