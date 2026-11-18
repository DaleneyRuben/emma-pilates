import type { PayStatementDto } from "@pilates/api-contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, CheckCircle2, RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  LoadingNotice,
  QueryFailure,
} from "../../components/page/query-failure";
import { PageHeader } from "../../components/page/page-header";
import { Button, buttonVariants } from "../../components/ui/button";
import {
  addDays,
  addMonths,
  boliviaMonth,
  boliviaToday,
  formatMonth,
} from "../../lib/bolivia-time";
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
import { recalculationSummary } from "./recalculation-summary";
import type { ApprovedNotice } from "./approve-statement-dialog";
import { StatementCard } from "./statement-card";

// Never sent: the query is disabled while a Rango ends before it starts.
const noPeriod: PayPeriodQuery = { month: "" };

const capitalized = (text: string) =>
  text.charAt(0).toLocaleUpperCase("es") + text.slice(1);

// Finding 105: the month being paid has not ended, so nothing in it can be
// approved yet; a Trainer can still be paid up to yesterday by Rango.
function MonthOpenNotice({
  month,
  today,
  onPayByRange,
}: {
  month: string;
  today: string;
  onPayByRange: () => void;
}) {
  const monthName = formatMonth(month).split(" ")[0] ?? "";
  const lastDay = Number(addDays(`${addMonths(month, 1)}-01`, -1).slice(8));
  const nextMonthName = formatMonth(addMonths(month, 1)).split(" ")[0] ?? "";
  return (
    <section
      aria-label="El mes no terminó"
      className="flex flex-wrap items-start gap-3 rounded-marco bg-primario-tinte px-4 py-3.5 md:px-5"
    >
      <p className="min-w-[240px] flex-1 text-nota text-texto">
        {`${capitalized(monthName)} todavía no terminó: cierra el ${lastDay}. Desde el 1 de ${nextMonthName} puedes aprobar a las instructoras, y a la coordinadora siete días después, porque su bono espera las renovaciones. Para pagarle antes a una instructora, elige Rango hasta ayer y vuelve a calcular.`}
      </p>
      {today.endsWith("-01") ? null : (
        <Button variant="secondary" size="sm" onClick={onPayByRange}>
          <CalendarRange size={16} aria-hidden="true" />
          Pagar por Rango
        </Button>
      )}
    </section>
  );
}

// FIX-072: after approving, «Subir comprobante» opens Pagados on her.
function DoneNotice({ notice }: { notice: ApprovedNotice }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-tarjeta bg-lino px-4 py-3 text-nota text-texto">
      <p role="status" className="flex min-w-[220px] flex-1 items-start gap-3">
        <CheckCircle2
          size={18}
          aria-hidden="true"
          className="mt-px flex-none text-exito"
        />
        {notice.text}
      </p>
      {notice.receiptFor === undefined ? null : (
        <Link
          to="/dinero/sueldos/pagados"
          search={{ staffMemberId: notice.receiptFor }}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          Subir comprobante
        </Link>
      )}
    </div>
  );
}

// BKO-006: the Administrator drafts a period and approves each statement.
// Approval creates the Salary Payment. A Trainer's own view is «Mis pagos».
// Follow-up 232: Sueldos › Por aprobar holds every statement of the period.
// BKO-009: a Trainer's pay covers a day, a week, a range or a month; the
// Coordinator's (BKO-007) only a month, so the API lists hers on Mes alone.
// Follow-up 274 (finding 105): option A.
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
  const statements = query.data;
  const change = (next: PayStatementsSearch) => {
    draft.reset();
    setNotice(null);
    onSearchChange(next);
  };

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
        <p role="alert" className="text-ayuda text-error-texto">
          No pudimos calcular el período.
        </p>
      ) : null}
      {notice === null ? null : <DoneNotice notice={notice} />}
      {shown.kind === "month" && search.month === boliviaMonth() ? (
        <MonthOpenNotice
          month={search.month}
          today={today}
          onPayByRange={() =>
            change({
              month: search.month,
              period: "range",
              from: `${search.month}-01`,
              to: addDays(today, -1),
            })
          }
        />
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
              today={today}
              onApproved={setNotice}
            />
          ))}
        </div>
      )}
    </div>
  );
}
