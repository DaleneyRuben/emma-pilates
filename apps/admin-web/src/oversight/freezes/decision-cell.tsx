import { decideFreeze, type FreezeReviewDto } from "@pilates/api-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminFetch } from "../../api/fetcher";
import { ApiError } from "../../api/problem";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import {
  decidedFreezesQueryOptions,
  requestedFreezesQueryOptions,
} from "./freeze-queries";

export function DecisionCell({
  freeze,
  onDone,
}: {
  freeze: FreezeReviewDto;
  onDone: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [refusing, setRefusing] = useState(false);
  const mutation = useMutation({
    mutationFn: (decision: "approved" | "refused") =>
      decideFreeze(freeze.id, { decision }, undefined, adminFetch),
    onSuccess: async (_result, decision) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: requestedFreezesQueryOptions().queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: decidedFreezesQueryOptions().queryKey,
        }),
      ]);
      onDone(
        decision === "approved"
          ? "Congelamiento aprobado"
          : "Congelamiento rechazado",
      );
    },
  });
  const problem =
    mutation.error instanceof ApiError &&
    mutation.error.code === "freeze_access_denied"
      ? "No puedes decidir un congelamiento."
      : mutation.error instanceof ApiError &&
          mutation.error.code === "freeze_start_in_past"
        ? "El congelamiento ya empezó. Recházalo y pide uno desde mañana."
        : mutation.error instanceof ApiError &&
            mutation.error.code === "freeze_already_decided"
          ? "Este congelamiento ya fue decidido."
          : mutation.isError
            ? "No pudimos guardar la decisión. Inténtalo de nuevo."
            : null;

  return (
    <span className="flex flex-col items-start gap-2">
      <span className="flex flex-wrap gap-2">
        {/* FIX-089: a row repeats down the table, so no solid button. */}
        <Button
          disabled={mutation.isPending}
          onClick={() => mutation.mutate("approved")}
          size="sm"
          type="button"
          variant="secondary"
        >
          Aprobar
        </Button>
        <Button
          disabled={mutation.isPending}
          onClick={() => setRefusing(true)}
          size="sm"
          type="button"
          variant="destructive"
        >
          Rechazar
        </Button>
      </span>
      <ConfirmDialog
        open={refusing}
        onOpenChange={setRefusing}
        title={`¿Rechazar el congelamiento de ${freeze.clientName}?`}
        confirmLabel="Sí, rechazar"
        busy={mutation.isPending}
        onConfirm={() =>
          mutation.mutate("refused", { onSettled: () => setRefusing(false) })
        }
      >
        Su plan sigue corriendo esas fechas. No se puede deshacer.
      </ConfirmDialog>
      {problem === null ? null : (
        <span className="text-nota text-error" role="alert">
          {problem}
        </span>
      )}
    </span>
  );
}
