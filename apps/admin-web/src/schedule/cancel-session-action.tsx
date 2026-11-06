import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { formatCancellationWindow } from "../studio-rules/studio-rules-format";
import {
  studioRulesQueryOptions,
  studioSettingsQueryOptions,
} from "../studio-rules/studio-rules-queries";
import { cancelledNotice } from "./schedule-notices";
import { scheduleProblem } from "./schedule-problems";
import { useScheduleChange } from "./use-schedule-change";

// The window comes from the Studio Settings (BKM-004); while it is unknown
// the sentence leaves it out rather than guess.
const refundCopy = (
  session: AdministratorSessionAvailabilityDto,
  cancellationWindowMinutes: number | undefined,
) => {
  if (session.bookedCount === 0 && session.waitlistCount === 0) {
    return "No tiene reservas. Se cancela y desaparece de la app.";
  }
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

type MinimumCheck = { minimumBookings: number; leadMinutes: number };

// The Studio Rule's minimum check (BKM-004): a Session below the minimum is
// cancelled by the system before it starts. While the rules are unknown the
// sentence leaves the numbers out and shows only for an empty Session.
const minimumNote = (
  bookedCount: number,
  check: MinimumCheck | undefined,
): string | null => {
  if (check === undefined) {
    return bookedCount === 0
      ? "Si no llega al mínimo de reservas, el sistema la cancela sola antes de empezar."
      : null;
  }
  if (bookedCount >= check.minimumBookings) return null;
  const minimum =
    check.minimumBookings === 1
      ? "1 reserva"
      : `${check.minimumBookings} reservas`;
  return `Si no llega a ${minimum}, el sistema la cancela sola ${formatCancellationWindow(check.leadMinutes)} antes de empezar.`;
};

// AW03 and S14: cancelling a Session that has not started (FIX-027). Every
// Booking is refunded, even inside the Cancellation Window, and booked and
// waitlisted Clients are notified; an empty Session simply leaves the apps.
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
  const settings = useQuery(studioSettingsQueryOptions());
  const [confirming, setConfirming] = useState(false);
  const note = minimumNote(
    session.bookedCount,
    settings.data === undefined
      ? undefined
      : {
          minimumBookings: settings.data.minimumBookings,
          leadMinutes: settings.data.minimumBookingsCheckLeadMinutes,
        },
  );

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
      {note === null ? null : (
        <p className="text-center text-ayuda text-texto-tenue">{note}</p>
      )}
      <Button
        variant="link"
        className="self-center text-error hover:text-error-texto"
        onClick={() => setConfirming(true)}
      >
        Cancelar esta clase
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="¿Cancelar esta clase?"
        confirmLabel="Sí, cancelar la clase"
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
