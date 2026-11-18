import type { PayStatementDto } from "@pilates/api-contracts";
import { useId, useState } from "react";
import { Button } from "../../components/ui/button";
import { boliviaToday, formatDayMonth } from "../../lib/bolivia-time";
import { formatBolivianos } from "../../lib/money";
import {
  ApproveStatementDialog,
  type ApprovedNotice,
} from "./approve-statement-dialog";
import { formatPayPeriod, type PayPeriodQuery } from "./pay-period-search";
import { ConceptRows, StatementLines } from "./statement-concepts";

// A Coordinator's statement pays a base and a renewal bonus (BKO-007); her
// approval waits for the renewals, a Trainer's for the period to end.
const isCoordinatorPay = (statement: PayStatementDto) =>
  statement.lines.some((line) => line.kind === "base" || line.kind === "bonus");

// FIX-084 (Sueldos B): one card per person still to approve, with her total,
// what it pays, every line on demand, and one solid «Aprobar Bs X». Until it
// can be approved the button stays grey with the date it opens.
export function StatementCard({
  statement,
  period,
  role,
  onApproved,
  today = boliviaToday(),
}: {
  statement: PayStatementDto;
  period: PayPeriodQuery;
  /** Her Role as the staff list names it; left out while unknown. */
  role?: string;
  onApproved: (notice: ApprovedNotice) => void;
  today?: string;
}) {
  const headingId = useId();
  const linesId = useId();
  const [confirming, setConfirming] = useState(false);
  const [showLines, setShowLines] = useState(false);
  const waits = statement.approvableOn > today;
  const total = formatBolivianos(statement.totalCentavos);
  const count = statement.lines.length;
  const periodText = formatPayPeriod(
    statement.periodStart,
    statement.periodEnd,
  );

  return (
    <article
      aria-labelledby={headingId}
      className="flex flex-col gap-3.5 rounded-tarjeta border border-borde bg-blanco px-5 py-5 md:px-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={headingId} className="font-serif text-[20px] text-texto">
            {statement.staffMemberName}
          </h2>
          <p className="text-nota text-texto-tenue">
            {role === undefined ? periodText : `${role} · ${periodText}`}
          </p>
        </div>
        <p className="font-serif text-precio whitespace-nowrap text-texto tabular">
          {total}
        </p>
      </div>
      <ConceptRows lines={statement.lines} />
      {showLines ? (
        <StatementLines id={linesId} lines={statement.lines} />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {count === 0 ? (
          <span />
        ) : (
          <button
            type="button"
            aria-expanded={showLines}
            aria-controls={showLines ? linesId : undefined}
            onClick={() => setShowLines((open) => !open)}
            className="rounded-control text-celda font-medium text-primario-profundo hover:text-primario-presionado focus-visible:shadow-foco"
          >
            {showLines
              ? "Ocultar las líneas"
              : count === 1
                ? "Ver la línea"
                : `Ver las ${count} líneas`}
          </button>
        )}
        {waits ? (
          <span className="flex flex-wrap items-center justify-end gap-3">
            {isCoordinatorPay(statement) ? (
              <span className="text-nota text-texto-tenue">
                Su bono espera las renovaciones
              </span>
            ) : null}
            <Button disabled>
              {`Se aprueba desde el ${formatDayMonth(statement.approvableOn)}`}
            </Button>
          </span>
        ) : (
          <Button
            onClick={() => setConfirming(true)}
          >{`Aprobar ${total}`}</Button>
        )}
      </div>
      <ApproveStatementDialog
        statement={statement}
        period={period}
        open={confirming}
        onOpenChange={setConfirming}
        onApproved={onApproved}
      />
    </article>
  );
}
