import type { AdministratorSessionRosterDto } from "@pilates/api-contracts";
import type { UseQueryResult } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { PageNotice } from "../components/page/page-notice";
import { LoadingNotice } from "../components/page/query-failure";
import { SidePanelFooter } from "../components/panel/side-panel";
import { Button } from "../components/ui/button";
import { RemoveBookingAction } from "./remove-booking-action";
import { SessionRoster } from "./session-roster";

// FIX-091 (W1, Editar clase A): the Reservas tab. Who booked and who waits,
// each with her photo or initials, and under them the full-width button to
// book a Client (or add her to the waitlist when the class is full). A past
// class shows the lists alone. W1: «Quitar» on each booking of a class
// still to come, and «Cerrar» at the foot.
export function SessionBookingsTab({
  roster,
  sessionId,
  branchId,
  full,
  past,
  onBook,
  onClose,
}: {
  roster: UseQueryResult<AdministratorSessionRosterDto>;
  sessionId: string;
  branchId: string;
  full: boolean;
  past: boolean;
  onBook: () => void;
  onClose: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const label = full
    ? "Agregar a la lista de espera"
    : "Reservar a una clienta";
  const book = past ? null : (
    <Button variant="secondary" className="w-full" onClick={onBook}>
      <UserPlus size={16} strokeWidth={1.8} aria-hidden="true" />
      {label}
    </Button>
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5 px-7 py-4">
        {notice === null ? null : <PageNotice>{notice}</PageNotice>}
        {roster.isPending ? (
          <LoadingNotice>Cargando quiénes reservaron…</LoadingNotice>
        ) : roster.isError ? (
          <div role="alert" className="flex items-center gap-3">
            <p className="flex-1 text-celda text-texto">
              No pudimos cargar quiénes reservaron.
            </p>
            <Button
              variant="neutral"
              size="sm"
              onClick={() => void roster.refetch()}
            >
              Reintentar
            </Button>
          </div>
        ) : (
          <SessionRoster
            roster={roster.data}
            actionFor={
              past
                ? undefined
                : (booking) => (
                    <RemoveBookingAction
                      sessionId={sessionId}
                      branchId={branchId}
                      bookingId={booking.bookingId}
                      clientName={booking.clientName}
                      onRemoved={setNotice}
                    />
                  )
            }
          />
        )}
        {book}
      </div>
      <SidePanelFooter>
        <Button variant="secondary" className="self-end" onClick={onClose}>
          Cerrar
        </Button>
      </SidePanelFooter>
    </div>
  );
}
