import type { MonthResultDto } from "@pilates/api-contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MonthStepper } from "../components/table/month-stepper";
import { LoadingNotice, QueryFailure } from "../components/page/query-failure";
import { Button } from "../components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { boliviaMonth } from "../lib/bolivia-time";
import { cn } from "../lib/cn";
import { formatBolivianos, formatSignedBolivianos } from "../lib/money";
import {
  monthResultQueryOptions,
  seedOpeningBudgetRequest,
} from "./finance-queries";

function Figure({
  name,
  rule,
  figure,
  line,
}: {
  name: string;
  rule: string;
  figure: string;
  line: string;
}) {
  return (
    <section
      aria-label={name}
      className={cn(
        "flex flex-col gap-1.5 rounded-tarjeta border border-borde border-t-[3px] bg-blanco px-5 py-4",
        rule,
      )}
    >
      <h2 className="font-sans text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
        {name}
      </h2>
      <p className="font-serif text-[32px] leading-tight text-texto tabular">
        {figure}
      </p>
      <p className="text-nota text-texto-tenue">{line}</p>
    </section>
  );
}

const Amount = ({ label, children }: { label: string; children: string }) => (
  <TableCell data-label={label} className="tabular md:text-right">
    {children}
  </TableCell>
);

function BudgetTable({ result }: { result: MonthResultDto }) {
  if (result.lines.length === 0) return null;
  const totalRow = "bg-superficie-sutil font-medium hover:bg-superficie-sutil";
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-titulo-panel text-texto">
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
    <div className="flex flex-col items-center gap-3 rounded-tarjeta border border-borde bg-blanco px-6 py-10 text-center">
      <p className="text-cuerpo text-texto-secundario">
        Aún no hay presupuesto.
      </p>
      <Button busy={seed.isPending} onClick={() => seed.mutate()}>
        Cargar presupuesto de apertura
      </Button>
      {seed.isError ? (
        <p role="alert" className="text-ayuda text-error-texto">
          No pudimos cargar el presupuesto.
        </p>
      ) : null}
    </div>
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
            <Figure
              name="Ingresos en caja"
              rule="border-t-exito"
              figure={formatBolivianos(result.cashIncomeCentavos)}
              line="Pagos confirmados en el mes"
            />
            <Figure
              name="Impuesto"
              rule="border-t-texto"
              figure={formatBolivianos(result.taxCentavos)}
              line={`${result.taxRatePercent} % de los ingresos en caja`}
            />
            <Figure
              name="Resultado"
              rule={
                result.resultCentavos < 0 ? "border-t-error" : "border-t-exito"
              }
              figure={formatSignedBolivianos(result.resultCentavos)}
              line="Ingresos en caja menos impuesto, gastos y nutricionista"
            />
            <Figure
              name="Punto de equilibrio"
              rule="border-t-texto"
              figure={formatBolivianos(result.breakEvenCentavos)}
              line="Ingreso en caja que cubre el presupuesto y la nutricionista"
            />
          </div>
          <p className="text-nota text-texto-tenue tabular">
            {`Costo de la nutricionista ${formatBolivianos(result.nutritionistCostCentavos)}`}
          </p>
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
