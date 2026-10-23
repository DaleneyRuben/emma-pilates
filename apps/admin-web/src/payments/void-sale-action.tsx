import {
  getListAdminPaymentsQueryKey,
  voidPayment,
} from "@pilates/api-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminFetch } from "../api/fetcher";
import { isApiError } from "../api/problem";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Input } from "../components/ui/input";

const problems: Record<string, string> = {
  payment_already_voided: "Esta venta ya fue anulada.",
  payment_not_voidable: "Solo se puede anular una venta confirmada.",
  void_reason_required: "Escribe el motivo de la anulación.",
};

// «Anular venta» corrects a mistake. It returns no money (decisions §4.3).
export function VoidSaleAction({
  paymentId,
  clientName,
}: {
  paymentId: string;
  clientName: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
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
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          setFailure(null);
          setOpen(true);
        }}
      >
        Anular venta
      </Button>
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
        <label className="flex flex-col gap-1 text-texto">
          <span className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
            Motivo
          </span>
          <Input
            aria-label="Motivo"
            value={reason}
            maxLength={300}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        {failure === null ? null : (
          <p role="alert" className="text-error-texto">
            {failure}
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
