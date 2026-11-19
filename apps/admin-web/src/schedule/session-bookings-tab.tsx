import type { AdministratorSessionRosterDto } from "@pilates/api-contracts";
import type { UseQueryResult } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { LoadingNotice } from "../components/page/query-failure";
import { Button } from "../components/ui/button";
import { SessionRoster } from "./session-roster";

// FIX-091 (W1, Editar clase A): the Reservas tab. Who booked and who waits,
// each with her photo or initials, and under them the full-width button to
// book a Client (or add her to the waitlist when the class is full). A past
// class shows the lists alone.
export function SessionBookingsTab({
  roster,
  full,
  past,
  onBook,
}: {
  roster: UseQueryResult<AdministratorSessionRosterDto>;
  full: boolean;
  past: boolean;
  onBook: () => void;
}) {
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
    <div className="flex flex-col gap-5 px-7 py-4">
      {roster.isPending ? (
        <LoadingNotice>Cargando quiénes reservaron…</LoadingNotice>
      ) : roster.isError ? (
        <div role="alert" className="flex items-center gap-3">
          <p className="flex-1 text-celda text-texto-secundario">
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
        <SessionRoster roster={roster.data} />
      )}
      {book}
    </div>
  );
}
