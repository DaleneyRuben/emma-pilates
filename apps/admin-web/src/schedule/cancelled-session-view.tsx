import type {
  AdministratorSessionAvailabilityDto,
  SessionCancellationSummaryDto,
} from "@pilates/api-contracts";
import { CalendarX } from "lucide-react";
import { StatusPill } from "../components/ui/status-pill";
import { cancellationNote, causeLabel } from "./session-cancellation";

// FIX-042 (follow-ups 243–245): a cancelled class opens read-only: its
// cause, when it happened, and how many it had booked by then. Nothing here
// books, edits or cancels.
export function CancelledSessionView({
  session,
  cancellation,
}: {
  session: AdministratorSessionAvailabilityDto;
  cancellation: SessionCancellationSummaryDto;
}) {
  const seats =
    cancellation.cause === "schedule_paused"
      ? `0 de ${session.capacity}`
      : `${cancellation.bookedCount} de ${session.capacity} al cancelarse`;

  return (
    <div className="flex flex-col gap-5 px-7 py-4">
      <div>
        <StatusPill
          tone={
            cancellation.cause === "schedule_paused" ? "advertencia" : "neutral"
          }
        >
          {causeLabel(cancellation.cause)}
        </StatusPill>
      </div>
      <p className="flex items-center gap-3 rounded-tarjeta border-l-4 border-primario bg-superficie px-4 py-3 tipo-compacto text-texto">
        <CalendarX
          size={18}
          aria-hidden="true"
          className="shrink-0 text-texto"
        />
        {cancellationNote(cancellation)}
      </p>
      <dl className="divide-y divide-borde rounded-tarjeta bg-superficie tipo-compacto text-texto shadow-tarjeta">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <dt className="text-texto">Instructora</dt>
          <dd>{session.trainerName}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <dt className="text-texto">Lugares</dt>
          <dd className="tabular">{seats}</dd>
        </div>
      </dl>
    </div>
  );
}
