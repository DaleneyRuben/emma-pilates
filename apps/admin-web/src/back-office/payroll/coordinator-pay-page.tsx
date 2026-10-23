import type { PayStatementDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { MonthStepper } from "../../components/table/month-stepper";
import { LoadingNotice, QueryFailure } from "../../components/page/query-failure";
import { PageHeader } from "../../components/page/page-header";
import { boliviaMonth } from "../../lib/bolivia-time";
import { payStatementsQueryOptions } from "./pay-statement-queries";
import { StatementCard } from "./statement-card";

const coordinatorLine = (
  kind: PayStatementDto["lines"][number]["kind"],
): boolean => kind === "base" || kind === "new_client" || kind === "bonus";

// BKO-007: the same statement the worker drafts for the Coordinator. Only
// the Administrator opens this page; the Coordinator is sent back to Horario.
export function CoordinatorPayPage({
  month,
  onMonthChange,
}: {
  month: string;
  onMonthChange: (month: string) => void;
}) {
  const query = useQuery(payStatementsQueryOptions(month));
  const statement = query.data?.find((row) =>
    row.lines.some((line) => coordinatorLine(line.kind)),
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Pago a la coordinadora"
        subtitle="Todo el estudio · solo lo ve la administradora."
      />
      <MonthStepper
        month={month}
        latest={boliviaMonth()}
        onChange={onMonthChange}
      />
      {query.isError ? (
        <QueryFailure
          error={query.error}
          what="el pago"
          onRetry={() => void query.refetch()}
        />
      ) : query.data === undefined ? (
        <LoadingNotice>Cargando el pago…</LoadingNotice>
      ) : statement === undefined ? (
        <p className="text-cuerpo text-texto-secundario">
          Este mes no tiene un pago calculado.
        </p>
      ) : (
        <StatementCard statement={statement} month={month} />
      )}
    </div>
  );
}
