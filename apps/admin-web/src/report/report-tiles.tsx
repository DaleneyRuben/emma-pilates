import type {
  ExpenseReportDto,
  IncomeReportDto,
  MonthResultDto,
} from "@pilates/api-contracts";
import { StatTile, StatTiles } from "../components/ui/stat-tile";
import { monthName } from "../lib/bolivia-time";
import { formatBolivianos, formatSignedBolivianos } from "../lib/money";

const Line = ({ children }: { children: string }) => <p>{children}</p>;

const Detail = ({ children }: { children: string }) => (
  <p className="text-ayuda tabular">{children}</p>
);

/** The break-even of the month the range ends in (Finanzas' own figure). */
function breakEvenLine(finance: MonthResultDto): string {
  if (finance.lines.length === 0) {
    return "Punto de equilibrio: carga el presupuesto en Finanzas";
  }
  return `Punto de equilibrio de ${monthName(finance.month.slice(0, 7))}: ${formatBolivianos(finance.breakEvenCentavos)}`;
}

/**
 * FIX-091 (W5 B): AW16's three figures, Entró, Salió and Quedó. The lines
 * under them say what each figure counts for the chosen scope (CONTEXT-MAP:
 * only cash income and a Branch's Expenses count for a Branch); Entró adds
 * how it compares with the month before, Quedó the month's break-even, which
 * is the whole studio's, so a Branch has none.
 */
export function ReportTiles({
  income,
  expenses,
  branchName,
  change,
  finance,
}: {
  income: IncomeReportDto;
  expenses: ExpenseReportDto;
  branchName: string | undefined;
  /** «+12 % que octubre», only when the range is one month. */
  change: string | null;
  finance: MonthResultDto | undefined;
}) {
  return (
    <StatTiles className="max-md:grid-cols-1">
      <StatTile label="Entró" figure={formatBolivianos(income.totalCentavos)}>
        <div className="flex flex-col gap-0.5 text-nota">
          {change === null ? null : <p className="font-medium">{change}</p>}
          {branchName === undefined ? (
            <>
              <Line>Pagos confirmados en el rango</Line>
              <Detail>
                {`Efectivo ${formatBolivianos(income.byMethod.cash)} · QR ${formatBolivianos(income.byMethod.transfer)}`}
              </Detail>
              <Detail>
                {`Planes ${formatBolivianos(income.byKind.plan)} · Evaluaciones ${formatBolivianos(income.byKind.evaluation)}`}
              </Detail>
            </>
          ) : (
            <Line>{`Pagos en efectivo cobrados en ${branchName}`}</Line>
          )}
        </div>
      </StatTile>
      <StatTile
        label="Salió"
        figure={formatBolivianos(expenses.totalCentavos)}
        line={
          branchName === undefined
            ? "Nómina más los gastos de cada sucursal"
            : `Gastos registrados en ${branchName}`
        }
      />
      <StatTile
        label="Quedó"
        figure={formatSignedBolivianos(
          income.totalCentavos - expenses.totalCentavos,
        )}
      >
        <div className="flex flex-col gap-0.5 text-nota">
          <Line>Ingresos menos gastos</Line>
          {branchName === undefined && finance !== undefined ? (
            <Line>{breakEvenLine(finance)}</Line>
          ) : null}
        </div>
      </StatTile>
    </StatTiles>
  );
}
