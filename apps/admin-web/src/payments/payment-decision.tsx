import { zodResolver } from "@hookform/resolvers/zod";
import {
  confirmPayment,
  rejectPayment,
  type PaymentReviewDto,
} from "@pilates/api-contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { adminFetch } from "../api/fetcher";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/form/form";
import { SidePanelFooter } from "../components/panel/side-panel";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Textarea } from "../components/ui/textarea";
import { formatBolivianos } from "../lib/money";
import {
  refreshAfterDecision,
  type DecisionOutcome,
} from "./payment-decision-cache";
import { activePlanRefusal, decisionProblem } from "./payment-problems";
import { paymentReviewQueryOptions } from "./payment-queries";

// The Client reads this reason in her app and notification (PAY-002), the
// backend's 1–300 characters after trimming.
const rejectionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Escribe el motivo del rechazo.")
    .max(300, "Escribe hasta 300 caracteres."),
});
type RejectionInput = z.input<typeof rejectionSchema>;
type RejectionOutput = z.output<typeof rejectionSchema>;

type Decision = { kind: "confirm" } | { kind: "reject"; reason: string };

function useDecision(review: PaymentReviewDto, clientId: string) {
  const queryClient = useQueryClient();
  const refresh = (outcome: DecisionOutcome) =>
    refreshAfterDecision(queryClient, {
      outcome,
      paymentId: review.id,
      clientId,
    });

  const mutation = useMutation({
    mutationFn: (decision: Decision) =>
      decision.kind === "confirm"
        ? confirmPayment(review.id, undefined, adminFetch)
        : rejectPayment(
            review.id,
            { reason: decision.reason },
            undefined,
            adminFetch,
          ),
    onSuccess: (_result, decision) =>
      refresh(decision.kind === "confirm" ? "confirmed" : "rejected"),
  });

  // After a conflict the review is read again: a settled Payment shows its
  // new state; one still pending was refused because of an active Plan.
  const afterConflict = async (): Promise<string | null> => {
    await refresh("unknown");
    const fresh = await queryClient.fetchQuery(
      paymentReviewQueryOptions(review.id),
    );
    return fresh.state === "pending" ? activePlanRefusal : null;
  };

  return { mutation, afterConflict };
}

// AW29 footer: confirming asks first (it starts the Plan and cannot be
// undone); "Rechazar" unfolds the mandatory reason instead of the buttons.
export function PaymentDecision({
  review,
  clientId,
  onDone,
}: {
  review: PaymentReviewDto;
  clientId: string;
  onDone: (notice: string) => void;
}) {
  const { mutation, afterConflict } = useDecision(review, clientId);
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<RejectionInput, unknown, RejectionOutput>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: { reason: "" },
  });
  const reason = useWatch({ control: form.control, name: "reason" });

  const decide = async (decision: Decision) => {
    setFailure(null);
    try {
      await mutation.mutateAsync(decision);
      onDone(
        decision.kind === "confirm"
          ? `Pago de ${review.clientName} confirmado: su plan ${review.planName} empieza hoy.`
          : `Pago de ${review.clientName} rechazado: le avisamos el motivo.`,
      );
    } catch (error) {
      setConfirming(false);
      const problem = decisionProblem(error);
      if (problem.kind === "conflict") {
        setFailure(await afterConflict());
      } else if (problem.kind === "reason") {
        form.setError("reason", { message: problem.message });
      } else {
        setFailure(problem.message);
      }
    }
  };

  const submitRejection = form.handleSubmit((values) =>
    decide({ kind: "reject", reason: values.reason }),
  );

  return (
    <SidePanelFooter>
      {failure === null ? null : (
        <p role="alert" className="text-nota text-error-texto">
          {failure}
        </p>
      )}
      {rejecting ? (
        <Form {...form}>
          <form
            onSubmit={submitRejection}
            noValidate
            className="flex flex-col gap-3"
          >
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo del rechazo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej. el monto no coincide con la transferencia recibida."
                      // The buttons are gone; the reason is the next step.
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    La clienta verá este mensaje para corregir y volver a
                    enviar.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                size="lg"
                className="flex-1"
                disabled={reason.trim() === "" || mutation.isPending}
              >
                Confirmar rechazo
              </Button>
              <Button
                variant="link"
                onClick={() => {
                  form.reset();
                  setRejecting(false);
                  setCancelled(true);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            disabled={mutation.isPending}
            onClick={() => setConfirming(true)}
          >
            Confirmar pago
          </Button>
          <Button
            variant="destructive"
            size="lg"
            disabled={mutation.isPending}
            // Back from the reason, focus returns to the button it left.
            autoFocus={cancelled}
            onClick={() => {
              setFailure(null);
              setRejecting(true);
            }}
          >
            Rechazar
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`¿Confirmar el pago de ${review.clientName}?`}
        confirmLabel="Confirmar pago"
        tone="primary"
        pending={mutation.isPending}
        onConfirm={() => void decide({ kind: "confirm" })}
      >
        <p>
          Verifica que {formatBolivianos(review.amountDueCentavos)} llegó a la
          cuenta del estudio. Al confirmar, su plan {review.planName} empieza
          hoy y le avisamos.
        </p>
      </ConfirmDialog>
    </SidePanelFooter>
  );
}
