import type { MonthResultDto } from "@pilates/api-contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MonthStepper } from "../components/table/month-stepper";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/empty-state";
import { StatTile } from "../components/ui/stat-tile";
import { fieldMessageClass } from "../components/form/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { boliviaMonth } from "../lib/bolivia-time";
import { formatBolivianos, formatSignedBolivianos } from "../lib/money";
import {
  monthResultQueryOptions,
  seedOpeningBudgetRequest,
} from "./finance-queries";

const Amount = ({ label, children }: { label: string; children: string }) => (
  <TableCell data-label={label} className="tabular md:text-right">
    {children}
  </TableCell>
);

function BudgetTable({ result }: { result: MonthResultDto }) {
  if (result.lines.length === 0) return null;
  const totalRow =
    "bg-superficie-hundida tipo-titulo-fila hover:bg-superficie-hundida";
  return (
    <section className="flex flex-col gap-3">
      <h2 className="tipo-titulo-seccion text-texto">
        Presupuesto frente a lo gastado
      </h2>
      <Table aria-label="Presupuesto frente a lo gastado">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Línea</TableHead>
            <TableHead className="text-right">Presupuesto</TableHead>
            <TableHead className="text-right">Gastado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.lines.map((line) => (
            <TableRow key={line.name}>
              <TableCell data-label="Línea">{line.name}</TableCell>
              <Amount label="Presupuesto">
                {formatBolivianos(line.budgetCentavos)}
              </Amount>
              <Amount label="Gastado">
                {formatBolivianos(line.actualCentavos)}
              </Amount>
            </TableRow>
          ))}
          <TableRow>
            <TableCell data-label="Línea">
              {`Imprevistos (${result.contingencyPercent} %)`}
            </TableCell>
            <Amount label="Presupuesto">
              {formatBolivianos(result.contingencyCentavos)}
            </Amount>
            <Amount label="Gastado">—</Amount>
          </TableRow>
          <TableRow className={totalRow}>
            <TableCell data-label="Línea">Total</TableCell>
            <Amount label="Presupuesto">
              {formatBolivianos(result.budgetTotalCentavos)}
            </Amount>
            <Amount label="Gastado">
              {formatBolivianos(
                result.lines.reduce(
                  (total, line) => total + line.actualCentavos,
                  0,
                ),
              )}
            </Amount>
          </TableRow>
        </TableBody>
      </Table>
    </section>
  );
}

function EmptyBudget({ month }: { month: string }) {
  const queryClient = useQueryClient();
  const seed = useMutation({
    mutationFn: seedOpeningBudgetRequest,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: monthResultQueryOptions(month).queryKey,
      }),
  });
  return (
    <EmptyState
      action={
        <div className="flex flex-col items-center gap-2">
          <Button busy={seed.isPending} onClick={() => seed.mutate()}>
            Cargar presupuesto de apertura
          </Button>
          {seed.isError ? (
            <p role="alert" className={fieldMessageClass}>
              No pudimos cargar el presupuesto.
            </p>
          ) : null}
        </div>
      }
    >
      Aún no hay presupuesto.
    </EmptyState>
  );
}

// Follow-up 201: one Bolivia month. Cash income, the tax, the budget against
// what was spent, the Nutritionist's cost, the result, and the break-even.
export function FinancePanel({
  month,
  onMonthChange,
}: {
  month: string;
  onMonthChange: (month: string) => void;
}) {
  const query = useQuery(monthResultQueryOptions(month));
  const result = query.data;

  return (
    <div className="flex flex-col gap-5">
      <MonthStepper
        month={month}
        latest={boliviaMonth()}
        onChange={onMonthChange}
      />
      {query.isError ? (
        <QueryFailure
          error={query.error}
          what="las finanzas"
          onRetry={() => void query.refetch()}
        />
      ) : result === undefined ? (
        <LoadingNotice>Cargando las finanzas…</LoadingNotice>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Ingresos en caja"
              figure={formatBolivianos(result.cashIncomeCentavos)}
              line="Pagos confirmados en el mes"
            />
            <StatTile
              label="Impuesto"
              figure={formatBolivianos(result.taxCentavos)}
              line={`${result.taxRatePercent} % de los ingresos en caja`}
            />
            <StatTile
              label="Resultado"
              figure={formatSignedBolivianos(result.resultCentavos)}
              line="Ingresos en caja menos impuesto, gastos, sueldos y nutricionista"
            />
            {/* Finding 107 (h): without a budget the break-even is only the
                Nutritionist's cost, a number that would pass for a real one. */}
            <StatTile
              label="Punto de equilibrio"
              figure={
                result.lines.length === 0
                  ? "—"
                  : formatBolivianos(result.breakEvenCentavos)
              }
              line={
                result.lines.length === 0
                  ? "Carga tu presupuesto para calcularlo"
                  : "Ingreso en caja que cubre el presupuesto y la nutricionista"
              }
            />
          </div>
          {/* Follow-up 285: the two costs sit in a white card, never loose
              on the page 100 (rule 3). */}
          <div className="flex flex-col gap-1 rounded-tarjeta bg-superficie px-[18px] py-3 tipo-titulo-fila text-texto tabular shadow-tarjeta">
            <p>
              {`Costo de la nutricionista ${formatBolivianos(result.nutritionistCostCentavos)}`}
            </p>
            {/* H10: the month's Salary Payments are a cost of their own. */}
            <p>
              {`Sueldos pagados ${formatBolivianos(result.salariesCentavos ?? 0)}`}
            </p>
          </div>
          {result.lines.length === 0 ? (
            <EmptyBudget month={month} />
          ) : (
            <BudgetTable result={result} />
          )}
        </>
      )}
    </div>
  );
}
