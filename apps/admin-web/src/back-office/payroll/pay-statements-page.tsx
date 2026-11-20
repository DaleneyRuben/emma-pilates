import type { PayStatementDto } from "@pilates/api-contracts";
import { avisoClass } from "../../components/ui/aviso";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { useState } from "react";
import {
  LoadingNotice,
  QueryFailure,
} from "../../components/page/query-failure";
import { PageHeader } from "../../components/page/page-header";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { InlineError } from "../../components/ui/inline-error";
import { TextLink } from "../../components/ui/text-link";
import { boliviaMonth, boliviaToday } from "../../lib/bolivia-time";
import { PayPeriodPicker } from "./pay-period-picker";
import {
  monthOpenLine,
  windowOf,
  type PayPeriodQuery,
  type PayStatementsSearch,
} from "./pay-period-search";
import {
  draftPayStatementsRequest,
  payStatementsQueryOptions,
} from "./pay-statement-queries";
import { payrollStaffQueryOptions } from "./payroll-queries";
import { recalculationSummary } from "./recalculation-summary";
import type { ApprovedNotice } from "./approve-statement-dialog";
import { StatementCard } from "./statement-card";

// Never sent: the query is disabled while a Rango ends before it starts.
const noPeriod: PayPeriodQuery = { month: "" };

// Finding 112: the receipt goes with the approval, so the notice only says
// what happened.
function DoneNotice({ notice }: { notice: ApprovedNotice }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-tarjeta bg-superficie shadow-tarjeta px-4 py-3 tipo-compacto text-texto">
      <p role="status" className="flex min-w-[220px] flex-1 items-start gap-3">
        <CheckCircle2
          size={18}
          aria-hidden="true"
          className="mt-px flex-none text-texto"
        />
        {notice.text}
      </p>
    </div>
  );
}

// BKO-006: the Administrator drafts a period and approves each statement.
// Approval creates the Salary Payment. A Trainer's own view is «Mis pagos».
// Follow-up 232: Sueldos › Por aprobar holds every statement of the period.
// BKO-009: a Trainer's pay covers a day, a week, a range or a month; the
// Coordinator's (BKO-007) only a month, so the API lists hers on Mes alone.
// Follow-up 274 (finding 105): option A. FIX-084: the owner's Sueldos B, one
// card per person with its own «Aprobar».
export function PayStatementsPage({
  search,
  onSearchChange,
}: {
  search: PayStatementsSearch;
  onSearchChange: (search: PayStatementsSearch) => void;
}) {
  const today = boliviaToday();
  const shown = windowOf(search, today);
  const period = shown.query;
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<ApprovedNotice | null>(null);
  const query = useQuery({
    ...payStatementsQueryOptions(period ?? noPeriod),
    enabled: period !== null,
  });
  const draft = useMutation({
    mutationFn: async (asked: PayPeriodQuery) => {
      const options = payStatementsQueryOptions(asked);
      const before =
        queryClient.getQueryData<PayStatementDto[]>(options.queryKey) ?? [];
      await draftPayStatementsRequest(asked);
      await queryClient.invalidateQueries({ queryKey: options.queryKey });
      const after = await queryClient.fetchQuery(options);
      return recalculationSummary(shown.label, before, after);
    },
    onMutate: () => setNotice(null),
  });
  // FIX-084: an approved statement is already in Pagados, never here.
  const statements = query.data?.filter(
    (statement) => statement.state !== "approved",
  );
  const approvedCount = (query.data?.length ?? 0) - (statements?.length ?? 0);
  const staff = useQuery(payrollStaffQueryOptions());
  const memberOf = (staffMemberId: string) =>
    staff.data?.find((one) => one.id === staffMemberId);
  const change = (next: PayStatementsSearch) => {
    draft.reset();
    setNotice(null);
    onSearchChange(next);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Sueldos"
        subtitle="Todo el estudio · instructoras y coordinadora, con las tarifas vigentes."
        actions={
          <Button
            variant="secondary"
            busy={draft.isPending}
            disabled={period === null}
            onClick={() =>
              // On the call, not the hook: changing the period resets the
              // mutation, and a summary of the old period then never shows.
              period &&
              draft.mutate(period, {
                onSuccess: (text) => setNotice({ text }),
              })
            }
          >
            <RefreshCw size={16} aria-hidden="true" />
            Volver a calcular
          </Button>
        }
      />
      <PayPeriodPicker search={search} onChange={change} />
      {draft.isError ? (
        <InlineError>No pudimos calcular el período.</InlineError>
      ) : null}
      {notice === null ? null : <DoneNotice notice={notice} />}
      {shown.kind === "month" && search.month === boliviaMonth() ? (
        <p className={avisoClass}>{monthOpenLine(search.month, today)}</p>
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
        <EmptyState>
          {approvedCount === 0 ? (
            `${shown.label}: sin pagos calculados.`
          ) : (
            <>
              {`${shown.label}: todos los sueldos están aprobados. Están en `}
              <TextLink asChild inline>
                <Link to="/dinero/sueldos/pagados">Pagados</Link>
              </TextLink>
              .
            </>
          )}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
          {statements.map((statement) => (
            <StatementCard
              key={statement.id}
              statement={statement}
              period={period}
              member={memberOf(statement.staffMemberId)}
              today={today}
              onApproved={setNotice}
            />
          ))}
        </div>
      )}
    </div>
  );
}
