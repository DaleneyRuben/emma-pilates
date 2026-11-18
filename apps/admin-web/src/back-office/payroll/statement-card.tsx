import type { PayStatementDto } from "@pilates/api-contracts";
import { Check, Clock } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "../../components/ui/button";
import { StatusPill } from "../../components/ui/status-pill";
import { boliviaToday, formatDayMonth } from "../../lib/bolivia-time";
import { formatBolivianos } from "../../lib/money";
import { ApproveStatementDialog } from "./approve-statement-dialog";
import { formatPayPeriod, type PayPeriodQuery } from "./pay-period-search";
import { StatementConcepts } from "./statement-concepts";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("es"))
    .join("");

// Follow-up 274 (option A): a full-width card with the total and a small
// «Aprobar pago» at the right, or when the statement opens for approval.
export function StatementCard({
  statement,
  period,
  onApproved,
  today = boliviaToday(),
}: {
  statement: PayStatementDto;
  period: PayPeriodQuery;
  onApproved: (message: string) => void;
  today?: string;
}) {
  const headingId = useId();
  const [confirming, setConfirming] = useState(false);
  const approved = statement.state === "approved";
  const waits = !approved && statement.approvableOn > today;
  const lines = statement.lines.length;
  return (
    <article
      aria-labelledby={headingId}
      className="overflow-hidden rounded-marco bg-lino"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 md:px-5">
        <span
          aria-hidden="true"
          className="flex size-10 flex-none items-center justify-center rounded-full bg-primario-tinte text-nota font-semibold text-primario-profundo"
        >
          {initials(statement.staffMemberName)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id={headingId} className="font-semibold text-texto">
            {statement.staffMemberName}
          </h2>
          <p className="text-nota text-texto-tenue">
            <span>
              {formatPayPeriod(statement.periodStart, statement.periodEnd)}
            </span>
            {` · ${lines} ${lines === 1 ? "línea" : "líneas"}`}
          </p>
        </div>
        <StatusPill tone={approved ? "exito" : "neutral"}>
          {approved ? "Aprobado" : "Borrador"}
        </StatusPill>
        <p className="font-serif text-[26px] whitespace-nowrap text-texto tabular">
          {formatBolivianos(statement.totalCentavos)}
        </p>
        {waits ? (
          <p className="inline-flex items-center gap-1.5 text-nota text-advertencia-texto">
            <Clock size={16} aria-hidden="true" />
            {`Se aprueba desde el ${formatDayMonth(statement.approvableOn)}`}
          </p>
        ) : null}
        {!approved && !waits ? (
          <Button size="sm" onClick={() => setConfirming(true)}>
            <Check size={16} aria-hidden="true" />
            Aprobar pago
          </Button>
        ) : null}
      </div>
      <StatementConcepts
        name={statement.staffMemberName}
        lines={statement.lines}
        totalCentavos={statement.totalCentavos}
      />
      {approved ? null : (
        <ApproveStatementDialog
          statement={statement}
          period={period}
          open={confirming}
          onOpenChange={setConfirming}
          onApproved={onApproved}
        />
      )}
    </article>
  );
}
