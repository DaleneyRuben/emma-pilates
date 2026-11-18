import type { PayStatementDto } from "@pilates/api-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isApiError } from "../../api/problem";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { formatBolivianos } from "../../lib/money";
import { formatPayPeriod, type PayPeriodQuery } from "./pay-period-search";
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

const failureOf = (error: unknown): string =>
  isApiError(error) && error.code === "pay_statement_month_open"
    ? "Todavía no se puede aprobar: el período no terminó. Para pagar antes a una instructora, usa Rango hasta ayer."
    : "No pudimos aprobar el pago.";

// Finding 105: approving creates the Salary Payment, so it always names the
// amount, the person and the period first.
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
  onApproved: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const total = formatBolivianos(statement.totalCentavos);
  const periodText = formatPayPeriod(
    statement.periodStart,
    statement.periodEnd,
  );
  const approve = useMutation({
    mutationFn: () => approvePayStatementRequest(statement.id),
    onSuccess: async () => {
      onOpenChange(false);
      onApproved(
        `Aprobamos ${total} a ${statement.staffMemberName}. Quedó en Pagados; ahí puedes subir el comprobante.`,
      );
      await queryClient.invalidateQueries({
        queryKey: payStatementsQueryOptions(period).queryKey,
      });
    },
  });
  const lines = statement.lines.length;
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) approve.reset();
        onOpenChange(next);
      }}
      title={`¿Aprobar ${total} a ${statement.staffMemberName} ${forPeriod(periodText)}?`}
      confirmLabel={`Aprobar ${total}`}
      tone="primary"
      busy={approve.isPending}
      onConfirm={() => approve.mutate()}
    >
      <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1 text-texto">
        <dt className="text-texto-tenue">Período</dt>
        <dd>{periodText}</dd>
        <dt className="text-texto-tenue">Líneas</dt>
        <dd>{`${lines} ${lines === 1 ? "línea" : "líneas"}`}</dd>
        <dt className="text-texto-tenue">Se registra</dt>
        <dd>Pago de sueldo con fecha de hoy</dd>
      </dl>
      <p>
        Después de aprobarlo ya no cambia aunque vuelvas a calcular. Puedes
        subir el comprobante desde Pagados.
      </p>
      {approve.isError ? (
        <p role="alert" className="text-error-texto">
          {failureOf(approve.error)}
        </p>
      ) : null}
    </ConfirmDialog>
  );
}
