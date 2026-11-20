import {
  getListAdminPaymentsQueryKey,
  voidPayment,
} from "@pilates/api-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { adminFetch } from "../api/fetcher";
import { isApiError } from "../api/problem";
import { fieldMessageClass } from "../components/form/form";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const problems: Record<string, string> = {
  payment_already_voided: "Esta venta ya fue anulada.",
  payment_not_voidable: "Solo se puede anular una venta confirmada.",
  void_reason_required: "Escribe el motivo de la anulación.",
};

// «Anular venta» corrects a mistake. It returns no money (decisions §4.3).
// FIX-091 (W4 B): the row's «⋯» menu opens it.
export function VoidSaleDialog({
  paymentId,
  clientName,
  open,
  onOpenChange: setOpen,
}: {
  paymentId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const reasonId = useId();
  const [reason, setReason] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const voidSale = useMutation({
    mutationFn: () =>
      voidPayment(
        paymentId,
        { reason: reason.trim() },
        { headers: { "Content-Type": "application/json" } },
        adminFetch,
      ),
  });

  const confirm = async () => {
    setFailure(null);
    try {
      await voidSale.mutateAsync();
      await queryClient.invalidateQueries({
        queryKey: getListAdminPaymentsQueryKey(),
      });
      setOpen(false);
      setReason("");
    } catch (error) {
      const code = isApiError(error) ? error.code : null;
      setFailure(
        (code !== null ? problems[code] : undefined) ??
          "No pudimos anular la venta. Inténtalo de nuevo.",
      );
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title={`¿Anular la venta de ${clientName}?`}
      confirmLabel="Anular venta"
      pending={reason.trim() === ""}
      busy={voidSale.isPending}
      onConfirm={() => void confirm()}
    >
      <p>
        El plan termina y las reservas futuras se cancelan. El dinero no se
        devuelve: una anulación corrige un error.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={reasonId}>Motivo</Label>
        <Input
          id={reasonId}
          value={reason}
          maxLength={300}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      {failure === null ? null : (
        <p role="alert" className={fieldMessageClass}>
          {failure}
        </p>
      )}
    </ConfirmDialog>
  );
}
