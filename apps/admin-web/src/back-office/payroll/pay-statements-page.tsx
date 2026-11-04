import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LoadingNotice,
  QueryFailure,
} from "../../components/page/query-failure";
import { PageHeader } from "../../components/page/page-header";
import { Button } from "../../components/ui/button";
import { PayPeriodPicker } from "./pay-period-picker";
import {
  windowOf,
  type PayPeriodQuery,
  type PayStatementsSearch,
} from "./pay-period-search";
import {
  draftPayStatementsRequest,
  payStatementsQueryOptions,
} from "./pay-statement-queries";
import { StatementCard } from "./statement-card";

// Never sent: the query is disabled while a Rango ends before it starts.
const noPeriod: PayPeriodQuery = { month: "" };

// BKO-006: the Administrator drafts a period and approves each statement.
// Approval creates the Salary Payment. A Trainer's own view is «Mis pagos».
// Follow-up 232: Sueldos › Por aprobar holds every statement of the period.
// BKO-009: a Trainer's pay covers a day, a week, a range or a month; the
// Coordinator's (BKO-007) only a month, so the API lists hers on Mes alone.
export function PayStatementsPage({
  search,
  onSearchChange,
}: {
  search: PayStatementsSearch;
  onSearchChange: (search: PayStatementsSearch) => void;
}) {
  const shown = windowOf(search);
  const period = shown.query;
  const queryClient = useQueryClient();
  const query = useQuery({
    ...payStatementsQueryOptions(period ?? noPeriod),
    enabled: period !== null,
  });
  const draft = useMutation({
    mutationFn: (asked: PayPeriodQuery) => draftPayStatementsRequest(asked),
    onSuccess: (_, asked) =>
      queryClient.invalidateQueries({
        queryKey: payStatementsQueryOptions(asked).queryKey,
      }),
  });
  const statements = query.data;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Sueldos por aprobar"
        subtitle="Todo el estudio · instructoras y coordinadora, con las tarifas vigentes."
        actions={
          <Button
            variant="secondary"
            busy={draft.isPending}
            disabled={period === null}
            onClick={() => period && draft.mutate(period)}
          >
            Calcular
          </Button>
        }
      />
      <PayPeriodPicker
        search={search}
        onChange={(next) => {
          draft.reset();
          onSearchChange(next);
        }}
      />
      {draft.isError ? (
        <p role="alert" className="text-ayuda text-error-texto">
          No pudimos calcular el período.
        </p>
      ) : null}
      {period === null ? null : query.isError ? (
        <QueryFailure
          error={query.error}
          what="los pagos"
          onRetry={() => void query.refetch()}
        />
      ) : statements === undefined ? (
        <LoadingNotice>Cargando los pagos…</LoadingNotice>
      ) : statements.length === 0 ? (
        <p className="text-cuerpo text-texto-secundario">
          {shown.label}: sin pagos calculados.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {statements.map((statement) => (
            <StatementCard
              key={statement.id}
              statement={statement}
              period={period}
            />
          ))}
        </div>
      )}
    </div>
  );
}
