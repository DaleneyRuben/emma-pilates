import type { OwnSalaryPaymentDto, PayStatementDto } from "@pilates/api-contracts";

import { formatCivilDayMonth } from "../assistant/assistant-format";
import { payPeriodHeading } from "./pay-period-heading";

/**
 * Finding 111: where a statement stands. An approved statement with a
 * `salaryPaymentId` was paid by that payment; the payment may be missing
 * from her list if it was voided since.
 */
export type StatementStatus =
  | { kind: "paid"; payment: OwnSalaryPaymentDto | undefined }
  | { kind: "unpaid" }
  | { kind: "open" };

export function statementStatus(
  statement: PayStatementDto,
  payments: OwnSalaryPaymentDto[],
): StatementStatus {
  if (statement.state !== "approved") return { kind: "open" };
  const paymentId = statement.salaryPaymentId ?? null;
  if (paymentId === null) return { kind: "unpaid" };
  return { kind: "paid", payment: payments.find((payment) => payment.id === paymentId) };
}

/** The row's one line under the period: «Pagado el 18 de noviembre». */
export function statusLine(status: StatementStatus): string {
  if (status.kind === "open") return "En curso · puede cambiar";
  if (status.kind === "unpaid") return "Aprobado · por pagar";
  return status.payment === undefined
    ? "Pagado"
    : `Pagado el ${formatCivilDayMonth(status.payment.paidOn)}`;
}

/** Payments Nómina recorded without a statement, such as one paid by hand. */
export function otherPayments(
  statements: PayStatementDto[],
  payments: OwnSalaryPaymentDto[],
): OwnSalaryPaymentDto[] {
  const linked = new Set(statements.map((statement) => statement.salaryPaymentId ?? null));
  return payments.filter((payment) => !linked.has(payment.id));
}

export type PaySummary = {
  eyebrow: string;
  centavos: number;
  note: string;
  /** The payment whose receipt the summary offers, when it has one. */
  receipt: OwnSalaryPaymentDto | null;
};

const classCount = (statement: PayStatementDto) => {
  const classes = statement.lines.filter((line) => line.kind === "class").length;
  return `${classes} ${classes === 1 ? "clase dictada" : "clases dictadas"}`;
};

/**
 * Proposal B's top card, in order of what matters now: what is owed, then
 * the open period, then the last payment. Statements and payments come
 * newest first.
 */
export function paySummary(
  statements: PayStatementDto[],
  payments: OwnSalaryPaymentDto[],
): PaySummary | null {
  const unpaid = statements.filter(
    (statement) => statementStatus(statement, payments).kind === "unpaid",
  );
  const [onlyUnpaid] = unpaid;
  if (onlyUnpaid !== undefined) {
    return {
      eyebrow: "Por cobrar",
      centavos: unpaid.reduce((total, statement) => total + statement.totalCentavos, 0),
      note:
        unpaid.length === 1
          ? `${payPeriodHeading(onlyUnpaid).label}, ya aprobada. Falta el pago.`
          : `${unpaid.length} liquidaciones aprobadas. Falta el pago.`,
      receipt: null,
    };
  }
  const open = statements.find((statement) => statement.state !== "approved");
  if (open !== undefined) {
    return {
      eyebrow: `En curso · ${payPeriodHeading(open).heading}`,
      centavos: open.totalCentavos,
      note: `${classCount(open)} hasta hoy · puede cambiar hasta que administración lo apruebe.`,
      receipt: null,
    };
  }
  const [last] = payments;
  if (last === undefined) return null;
  const statement = statements.find((candidate) => candidate.salaryPaymentId === last.id);
  const receipt = (last.receiptUrl ?? null) === null ? null : last;
  const paidFor =
    statement === undefined
      ? "Pago registrado por administración."
      : `${payPeriodHeading(statement).label}.`;
  return {
    eyebrow: `Último pago · ${formatCivilDayMonth(last.paidOn)}`,
    centavos: last.amountCentavos,
    note: receipt === null ? `${paidFor} Sin comprobante adjunto.` : paidFor,
    receipt,
  };
}
