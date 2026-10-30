import { rescheduleEvaluation, type EvaluationSlotDto } from "@pilates/api-contracts";

const rescheduleProblems: Record<string, string> = {
  evaluation_slot_unavailable: "Ese horario ya no está disponible. Elige otro.",
  evaluation_reschedule_closed: "Ese horario ya cerró: se puede reprogramar hasta 3 horas antes.",
  evaluation_paid_not_cancellable: "Esta evaluación ya está pagada. Puedes reprogramarla.",
};

export const rescheduleFailure = (body: unknown): string => {
  const code =
    typeof body === "object" && body !== null ? (body as { code?: unknown }).code : undefined;
  return (
    (typeof code === "string" ? rescheduleProblems[code] : undefined) ??
    "No pudimos reprogramar la evaluación. Inténtalo de nuevo."
  );
};

export const moveEvaluation = (
  evaluationId: string,
  slot: EvaluationSlotDto,
  idempotencyKey: string,
  fetcher: typeof globalThis.fetch,
) =>
  rescheduleEvaluation(
    evaluationId,
    {
      body: JSON.stringify({ slotId: slot.id }),
      headers: {
        "Content-Type": "application/json",
        "idempotency-key": idempotencyKey,
      },
    },
    fetcher,
  );
