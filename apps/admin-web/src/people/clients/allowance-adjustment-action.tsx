import {
  getGetAdminClientQueryKey,
  recordAllowanceAdjustment,
  type RecordAllowanceAdjustmentDtoReason,
} from "@pilates/api-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminFetch } from "../../api/fetcher";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Input } from "../../components/ui/input";

const forms = {
  courtesy: {
    open: "Agregar clase de cortesía",
    title: "¿Agregar una clase de cortesía?",
    confirm: "Registrar cortesía",
    note: "La clase se suma al plan vigente. No es un pago.",
  },
  class_return: {
    open: "Devolver una clase",
    title: "¿Registrar una clase devuelta?",
    confirm: "Registrar devolución",
    note: "La clase vuelve al plan vigente.",
  },
} as const;

// PAY-006's form for the allowance adjustment the Administrator already has
// (BKM-008). Courtesy and a returned class, never a gift.
export function AllowanceAdjustmentAction({
  clientId,
  reason,
}: {
  clientId: string;
  reason: RecordAllowanceAdjustmentDtoReason;
}) {
  const copy = forms[reason];
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [classes, setClasses] = useState("1");
  const [failure, setFailure] = useState<string | null>(null);
  const count = Number(classes);
  const record = useMutation({
    mutationFn: () =>
      recordAllowanceAdjustment(
        clientId,
        { classes: count, reason },
        { headers: { "Content-Type": "application/json" } },
        adminFetch,
      ),
  });

  const confirm = async () => {
    setFailure(null);
    try {
      await record.mutateAsync();
      await queryClient.invalidateQueries({
        queryKey: getGetAdminClientQueryKey(clientId),
      });
      setOpen(false);
    } catch {
      setFailure("No pudimos registrar la clase. Inténtalo de nuevo.");
    }
  };

  return (
    <>
      <Button
        variant="neutral"
        size="sm"
        className="self-start"
        onClick={() => {
          setFailure(null);
          setOpen(true);
        }}
      >
        {copy.open}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={copy.title}
        confirmLabel={copy.confirm}
        tone="primary"
        pending={!Number.isInteger(count) || count < 1}
        busy={record.isPending}
        onConfirm={() => void confirm()}
      >
        <p>{copy.note}</p>
        <label className="flex flex-col gap-1 text-texto">
          <span className="text-etiqueta-campo font-medium tracking-[0.14em] text-texto-tenue uppercase">
            Clases
          </span>
          <Input
            aria-label="Clases"
            type="number"
            min={1}
            value={classes}
            onChange={(event) => setClasses(event.target.value)}
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
