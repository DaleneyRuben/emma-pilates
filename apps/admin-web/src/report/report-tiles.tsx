import type { ExpenseReportDto, IncomeReportDto } from "@pilates/api-contracts";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { formatBolivianos, formatSignedBolivianos } from "../lib/money";

function Tile({
  name,
  rule,
  figure,
  children,
}: {
  name: string;
  rule: string;
  figure: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={name}
      className={cn(
        "flex min-w-0 flex-col gap-1.5 rounded-tarjeta border border-borde border-t-[3px] bg-blanco px-5 py-4 lg:px-3 xl:px-5",
        rule,
      )}
    >
      <h2 className="font-sans text-etiqueta-campo font-medium tracking-[0.14em] whitespace-nowrap text-texto-tenue uppercase">
        {name}
      </h2>
      <p className="font-serif text-[32px] leading-tight whitespace-nowrap text-texto tabular lg:text-[26px] xl:text-[32px]">
        {figure}
      </p>
      {children}
    </section>
  );
}

const Line = ({ children }: { children: string }) => (
  <p className="text-nota text-texto-tenue">{children}</p>
);

/**
 * AW16's three figures (design README): Ingresos in Éxito, Gastos in Error,
 * Neto in Plomo cálido, since the net is a summary, not a status. The
 * lines under them say what each figure counts for the chosen scope
 * (CONTEXT-MAP: only cash income and a Branch's Expenses count for a Branch).
 */
export function ReportTiles({
  income,
  expenses,
  branchName,
}: {
  income: IncomeReportDto;
  expenses: ExpenseReportDto;
  branchName: string | undefined;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3 lg:gap-2 xl:gap-3">
      <Tile
        name="Ingresos"
        rule="border-t-exito"
        figure={formatBolivianos(income.totalCentavos)}
      >
        {branchName === undefined ? (
          <>
            <Line>Pagos confirmados en el rango</Line>
            <p className="text-ayuda text-texto-muy-tenue tabular">
              {`Efectivo ${formatBolivianos(income.byMethod.cash)} · Transferencias ${formatBolivianos(income.byMethod.transfer)}`}
            </p>
            <p className="text-ayuda text-texto-muy-tenue tabular">
              {`Planes ${formatBolivianos(income.byKind.plan)} · Evaluaciones ${formatBolivianos(income.byKind.evaluation)}`}
            </p>
          </>
        ) : (
          <Line>{`Pagos en efectivo cobrados en ${branchName}`}</Line>
        )}
      </Tile>
      <Tile
        name="Gastos"
        rule="border-t-error"
        figure={formatBolivianos(expenses.totalCentavos)}
      >
        <Line>
          {branchName === undefined
            ? "Nómina más los gastos de cada sucursal"
            : `Gastos registrados en ${branchName}`}
        </Line>
      </Tile>
      <Tile
        name="Neto"
        rule="border-t-texto"
        figure={formatSignedBolivianos(
          income.totalCentavos - expenses.totalCentavos,
        )}
      >
        <Line>Ingresos menos gastos</Line>
      </Tile>
    </div>
  );
}
