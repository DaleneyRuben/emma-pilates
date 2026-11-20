import {
  staffRoleLabel,
  type PayStatementDto,
  type StaffMemberDto,
} from "@pilates/api-contracts";
import { useId, useState } from "react";
import { Button } from "../../components/ui/button";
import { TextLink } from "../../components/ui/text-link";
import { boliviaToday, formatDayMonth } from "../../lib/bolivia-time";
import { formatBolivianos } from "../../lib/money";
import {
  ApproveStatementDialog,
  type ApprovedNotice,
} from "./approve-statement-dialog";
import { formatPayPeriod, type PayPeriodQuery } from "./pay-period-search";
import { ConceptRows, StatementLines } from "./statement-concepts";

// FIX-084 (Sueldos B): one card per person still to approve, with her total,
// what it pays, every line on demand, and one solid «Aprobar Bs X». Until it
// can be approved the button stays grey with the date it opens.
export function StatementCard({
  statement,
  period,
  member,
  onApproved,
  today = boliviaToday(),
}: {
  statement: PayStatementDto;
  period: PayPeriodQuery;
  /** Her staff record, for her Role; left out while unknown. */
  member?: Pick<StaffMemberDto, "role" | "gender">;
  onApproved: (notice: ApprovedNotice) => void;
  today?: string;
}) {
  const headingId = useId();
  const linesId = useId();
  const [confirming, setConfirming] = useState(false);
  const [showLines, setShowLines] = useState(false);
  const waits = statement.approvableOn > today;
  const role =
    member === undefined
      ? undefined
      : staffRoleLabel(member.role, member.gender);
  const total = formatBolivianos(statement.totalCentavos);
  const count = statement.lines.length;
  const periodText = formatPayPeriod(
    statement.periodStart,
    statement.periodEnd,
  );

  return (
    <article
      aria-labelledby={headingId}
      // Rosa Emma (RW-sueldos): a Rosa profundo head with her name and the
      // total in Lora over the white card with its lines.
      className="flex flex-col overflow-hidden rounded-tarjeta bg-superficie shadow-tarjeta"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-destacado px-5 py-[18px] text-sobre-primario md:px-[22px]">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={headingId} className="tipo-titulo-seccion">
            {statement.staffMemberName}
          </h2>
          <p className="tipo-compacto">
            {role === undefined ? periodText : `${role} · ${periodText}`}
          </p>
        </div>
        <p className="tipo-cifra-grande whitespace-nowrap">{total}</p>
      </div>
      <div className="flex flex-col gap-3.5 px-5 pt-2 pb-5 md:px-[22px]">
        <ConceptRows lines={statement.lines} />
        {showLines ? (
          <StatementLines id={linesId} lines={statement.lines} />
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {count === 0 ? (
            <span />
          ) : (
            <TextLink
              aria-expanded={showLines}
              aria-controls={showLines ? linesId : undefined}
              onClick={() => setShowLines((open) => !open)}
              className="rounded-control"
            >
              {showLines
                ? "Ocultar las líneas"
                : count === 1
                  ? "Ver la línea"
                  : `Ver las ${count} líneas`}
            </TextLink>
          )}
          {waits ? (
            <span className="flex flex-wrap items-center justify-end gap-3">
              {/* BKO-007: her approval waits for the renewals. */}
              {member?.role === "coordinator" ? (
                <span className="tipo-secundario text-texto">
                  Su bono espera las renovaciones
                </span>
              ) : null}
              <Button variant="secondary" disabled>
                {`Se aprueba desde el ${formatDayMonth(statement.approvableOn)}`}
              </Button>
            </span>
          ) : (
            // FIX-089: one card per member, so no solid button.
            <Button variant="secondary" onClick={() => setConfirming(true)}>
              {`Aprobar ${total}`}
            </Button>
          )}
        </div>
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
