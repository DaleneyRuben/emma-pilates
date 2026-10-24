import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { formatCancellationWindow } from "../studio-rules/studio-rules-format";
import { studioRulesQueryOptions } from "../studio-rules/studio-rules-queries";
import { cancelledNotice } from "./schedule-notices";
import { scheduleProblem } from "./schedule-problems";
import { useScheduleChange } from "./use-schedule-change";

// The window comes from the Studio Settings (BKM-004); while it is unknown
// the sentence leaves it out rather than guess.
const refundCopy = (
  session: AdministratorSessionAvailabilityDto,
  cancellationWindowMinutes: number | undefined,
) => {
  const bookings =
    session.bookedCount === 1
      ? "Se cancela la reserva y la clienta recupera su clase"
      : `Se cancelan las ${session.bookedCount} reservas y cada clienta recupera su clase`;
  const waitlist =
    session.waitlistCount === 0
      ? "Avisamos a cada clienta."
      : session.waitlistCount === 1
        ? "Avisamos a cada clienta y a la persona en lista de espera."
        : `Avisamos a cada clienta y a las ${session.waitlistCount} personas en lista de espera.`;
  const window =
    cancellationWindowMinutes === undefined
      ? ""
      : `, aunque falten menos de ${formatCancellationWindow(cancellationWindowMinutes)}`;
  return `${bookings}${window}. ${waitlist} No se puede deshacer.`;
};

// AW03 and S14: the last-resort cancellation of a Session that has Bookings
// when no substitute Trainer can cover it. Every Booking is refunded, even
// inside the Cancellation Window, and booked and waitlisted Clients are
// notified. A Session without Bookings is cancelled by the 2-hour check.
export function CancelSessionAction({
  session,
  branchId,
  onDone,
  onFailure,
}: {
  session: AdministratorSessionAvailabilityDto;
  branchId: string;
  onDone: (notice: string) => void;
  onFailure: (message: string) => void;
}) {
  const change = useScheduleChange(branchId);
  const studioRules = useQuery(studioRulesQueryOptions());
  const [confirming, setConfirming] = useState(false);

  if (session.bookedCount === 0) {
    return (
      <p className="text-center text-ayuda text-texto-tenue">
        Sin reservas: si sigue vacía, el sistema la cancela sola 2 horas antes
        de empezar.
      </p>
    );
  }

  const cancel = async () => {
    try {
      const outcome = await change.mutateAsync({
        kind: "cancel-session",
        sessionId: session.id,
      });
      setConfirming(false);
      if (outcome.kind === "cancel-session") {
        onDone(cancelledNotice(outcome.result.affectedBookings));
      }
    } catch (error) {
      setConfirming(false);
      onFailure(scheduleProblem(error).message);
    }
  };

  return (
    <>
      <Button
        variant="link"
        className="self-center text-error hover:text-error-texto"
        onClick={() => setConfirming(true)}
      >
        Cancelar sesión
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="¿Cancelar esta sesión?"
        confirmLabel="Cancelar sesión"
        busy={change.isPending}
        onConfirm={() => void cancel()}
      >
        <p>
          {refundCopy(session, studioRules.data?.cancellationWindowMinutes)}
        </p>
      </ConfirmDialog>
    </>
  );
}
