import type { PayStatementDto } from "@pilates/api-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { isApiError } from "../../api/problem";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { InlineError } from "../../components/ui/inline-error";
import { formatBolivianos } from "../../lib/money";
import { PayoutQrSlot } from "./payout-qr/payout-qr-slot";
import { formatPayPeriod, type PayPeriodQuery } from "./pay-period-search";
import { SalaryReceiptField, type SalaryReceipt } from "./salary-receipt-field";
import {
  approvePayStatementRequest,
  payStatementsQueryOptions,
} from "./pay-statement-queries";

const lower = (text: string) =>
  text.charAt(0).toLocaleLowerCase("es") + text.slice(1);

// «por septiembre de 2026», «del 01/11/2026 al 17/11/2026», «por el 03/11/2026».
const forPeriod = (periodText: string) => {
  if (periodText.startsWith("Del ")) return lower(periodText);
  if (/^\d/.test(periodText)) return `por el ${periodText}`;
  return `por ${lower(periodText)}`;
};

const failures: Record<string, string> = {
  pay_statement_month_open:
    "Todavía no se puede aprobar: el período no terminó. Para pagarle antes a una instructora, elige Rango hasta ayer y vuelve a calcular.",
  salary_receipt_not_ready: "No pudimos usar ese comprobante. Súbelo de nuevo.",
  salary_receipt_required: "Sube el comprobante para aprobar el pago.",
};

const failureOf = (error: unknown): string =>
  (isApiError(error) ? failures[error.code] : undefined) ??
  "No pudimos aprobar el pago.";

/** What Sueldos says after approving. */
export type ApprovedNotice = { text: string };

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

// Finding 105: approving creates the Salary Payment, so it always names the
// amount, the person and the period first. Finding 112: it also carries the
// photo of the transfer, so it waits for one.
export function ApproveStatementDialog({
  statement,
  period,
  open,
  onOpenChange,
  onApproved,
}: {
  statement: PayStatementDto;
  period: PayPeriodQuery;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved: (notice: ApprovedNotice) => void;
}) {
  const queryClient = useQueryClient();
  const [receipt, setReceipt] = useState<SalaryReceipt | null>(null);
  const [uploading, setUploading] = useState(false);
  const receiptHintId = useId();
  const total = formatBolivianos(statement.totalCentavos);
  const periodText = formatPayPeriod(
    statement.periodStart,
    statement.periodEnd,
  );
  const approve = useMutation({
    mutationFn: (receiptImageAssetId: string) =>
      approvePayStatementRequest(statement.id, receiptImageAssetId),
    onSuccess: async () => {
      onOpenChange(false);
      setReceipt(null);
      onApproved({
        text: `Aprobamos ${total} a ${statement.staffMemberName} con su comprobante. Quedó en Pagados y ${firstName(statement.staffMemberName)} lo verá en su app.`,
      });
      await queryClient.invalidateQueries({
        queryKey: payStatementsQueryOptions(period).queryKey,
      });
    },
    onError: (error) => {
      if (isApiError(error) && error.code === "salary_receipt_not_ready") {
        setReceipt(null);
      }
    },
  });
  const lines = statement.lines.length;
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          approve.reset();
          setReceipt(null);
        }
        onOpenChange(next);
      }}
      title={`¿Aprobar ${total} a ${statement.staffMemberName} ${forPeriod(periodText)}?`}
      confirmLabel={`Aprobar ${total}`}
      tone="primary"
      wide
      busy={approve.isPending}
      pending={receipt?.kind !== "uploaded" || uploading}
      confirmDescribedBy={receipt === null ? receiptHintId : undefined}
      onConfirm={() => {
        if (receipt?.kind === "uploaded") approve.mutate(receipt.imageAssetId);
      }}
    >
      <div className="grid gap-6 min-[640px]:grid-cols-[280px_minmax(0,1fr)]">
        {/* FIX-072 (follow-up 276): the QR she is paid by, or why there is none. */}
        <PayoutQrSlot
          staffMemberId={statement.staffMemberId}
          staffName={statement.staffMemberName}
        />
        <div className="flex flex-col gap-2">
          <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1 text-texto">
            <dt className="text-texto">Período</dt>
            <dd className="tipo-titulo-fila">{periodText}</dd>
            <dt className="text-texto">Líneas</dt>
            <dd className="tipo-titulo-fila">{`${lines} ${lines === 1 ? "línea" : "líneas"}`}</dd>
            <dt className="text-texto">Se registra</dt>
            <dd className="tipo-titulo-fila">
              Pago de sueldo con fecha de hoy
            </dd>
          </dl>
          <p>Después de aprobarlo ya no cambia aunque vuelvas a calcular.</p>
          <SalaryReceiptField
            value={receipt}
            onChange={setReceipt}
            action="aprobar"
            hintId={receiptHintId}
            onUploadingChange={setUploading}
          />
        </div>
      </div>
      {approve.isError ? (
        <InlineError>{failureOf(approve.error)}</InlineError>
      ) : null}
    </ConfirmDialog>
  );
}
