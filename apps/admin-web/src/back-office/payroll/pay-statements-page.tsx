import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MonthStepper } from "../../components/table/month-stepper";
import { LoadingNotice, QueryFailure } from "../../components/page/query-failure";
import { PageHeader } from "../../components/page/page-header";
import { Button } from "../../components/ui/button";
import { boliviaMonth } from "../../lib/bolivia-time";
import {
  draftPayStatementsRequest,
  payStatementsQueryOptions,
} from "./pay-statement-queries";
import { StatementCard } from "./statement-card";

// BKO-006: the Administrator drafts a month and approves each statement.
// Approval creates the Salary Payment. A Trainer's own view is «Mis pagos».
export function PayStatementsPage({
  month,
  onMonthChange,
}: {
  month: string;
  onMonthChange: (month: string) => void;
}) {
  const queryClient = useQueryClient();
  const query = useQuery(payStatementsQueryOptions(month));
  const draft = useMutation({
    mutationFn: () => draftPayStatementsRequest(month),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: payStatementsQueryOptions(month).queryKey,
      }),
  });
  const statements = query.data;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Pagos a instructoras"
        subtitle="Todo el estudio · el cálculo sale de las tarifas vigentes."
        actions={
          <Button
            variant="secondary"
            busy={draft.isPending}
            onClick={() => draft.mutate()}
          >
            Calcular mes
          </Button>
        }
      />
      <MonthStepper
        month={month}
        latest={boliviaMonth()}
        onChange={onMonthChange}
      />
      {draft.isError ? (
        <p role="alert" className="text-ayuda text-error-texto">
          No pudimos calcular el mes.
        </p>
      ) : null}
      {query.isError ? (
        <QueryFailure
          error={query.error}
          what="los pagos"
          onRetry={() => void query.refetch()}
        />
      ) : statements === undefined ? (
        <LoadingNotice>Cargando los pagos…</LoadingNotice>
      ) : statements.length === 0 ? (
        <p className="text-cuerpo text-texto-secundario">
          Este mes no tiene pagos calculados.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {statements.map((statement) => (
            <StatementCard
              key={statement.id}
              statement={statement}
              month={month}
            />
          ))}
        </div>
      )}
    </div>
  );
}
