import { decideFreeze, type FreezeReviewDto } from "@pilates/api-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { adminFetch } from "../../api/fetcher";
import { ApiError } from "../../api/problem";
import {
  SidePanelBody,
  SidePanelFooter,
} from "../../components/panel/side-panel";
import { SummaryBlock, SummaryRow } from "../../components/panel/summary-rows";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
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

const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? "";

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
  // W16 B/C (owner 2026-11-19): sent to the Client with a refusal only.
  const [refusalReason, setRefusalReason] = useState("");
  const reasonId = useId();
  const mutation = useMutation({
    mutationFn: (decision: "approved" | "refused") => {
      const reason = refusalReason.trim();
      return decideFreeze(
        freeze.id,
        decision === "refused" && reason !== ""
          ? { decision, refusalReason: reason }
          : { decision },
        undefined,
        adminFetch,
      );
    },
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={reasonId}>Motivo si rechazas (opcional)</Label>
            <Textarea
              id={reasonId}
              rows={3}
              maxLength={300}
              value={refusalReason}
              aria-describedby={`${reasonId}-hint`}
              onChange={(event) => setRefusalReason(event.target.value)}
            />
            <p id={`${reasonId}-hint`} className="text-ayuda text-texto-tenue">
              {`Se lo enviamos a ${firstName(freeze.clientName)}`}
            </p>
          </div>
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
