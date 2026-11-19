import { decideFreeze, type FreezeReviewDto } from "@pilates/api-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminFetch } from "../../api/fetcher";
import { ApiError } from "../../api/problem";
import {
  SidePanelBody,
  SidePanelFooter,
} from "../../components/panel/side-panel";
import { SummaryBlock, SummaryRow } from "../../components/panel/summary-rows";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { formatDayRange } from "../../lib/day-range";
import { freezeDayCount, freezePendingPlanEnd } from "./freeze-format";
import {
  decidedFreezesQueryOptions,
  requestedFreezesQueryOptions,
} from "./freeze-queries";

const problemOf = (error: unknown): string | null => {
  if (error === null) return null;
  if (error instanceof ApiError) {
    switch (error.code) {
      case "freeze_access_denied":
        return "No puedes decidir un congelamiento.";
      case "freeze_start_in_past":
        return "El congelamiento ya empezó. Recházalo y pide uno desde mañana.";
      case "freeze_already_decided":
        return "Este congelamiento ya fue decidido.";
    }
  }
  return "No pudimos guardar la decisión. Inténtalo de nuevo.";
};

/** «Trimestral 24 clases · 18 restantes»; the name alone from an older API. */
const planLine = (freeze: FreezeReviewDto): string =>
  freeze.remainingClassAllowance === undefined
    ? freeze.planName
    : `${freeze.planName} · ${freeze.remainingClassAllowance} ${
        freeze.remainingClassAllowance === 1 ? "restante" : "restantes"
      }`;

// FIX-091 (W16 B): «Revisar» opens one pending request with what it asks,
// her Plan, the end approving produces, and her reason, and the decision at
// the foot. Refusing asks first (FIX-089); approving is the primary action.
export function FreezeReviewPanel({
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
  const problem = problemOf(mutation.error);
  const end = freezePendingPlanEnd(freeze);

  return (
    <>
      <SidePanelBody>
        <div className="flex flex-col gap-5">
          <SummaryBlock title="Solicitud">
            <SummaryRow label="Pide">
              {`${formatDayRange(freeze.startsOn, freeze.endsOn)} (${freezeDayCount(freeze.startsOn, freeze.endsOn)})`}
            </SummaryRow>
            <SummaryRow label="Plan">{planLine(freeze)}</SummaryRow>
            <SummaryRow label="Vencería">{end ?? "—"}</SummaryRow>
            <SummaryRow label="Motivo">{freeze.reason}</SummaryRow>
          </SummaryBlock>
          {problem === null ? null : (
            <p role="alert" className="text-nota text-error">
              {problem}
            </p>
          )}
        </div>
      </SidePanelBody>
      <SidePanelFooter>
        <div className="flex justify-end gap-2">
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => setRefusing(true)}
          >
            Rechazar
          </Button>
          <Button
            busy={mutation.isPending && mutation.variables === "approved"}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate("approved")}
          >
            Aprobar
          </Button>
        </div>
      </SidePanelFooter>
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
    </>
  );
}
