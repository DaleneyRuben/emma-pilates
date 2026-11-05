import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Lock, UserPlus } from "lucide-react";
import { PageNotice } from "../components/page/page-notice";
import { LoadingNotice } from "../components/page/query-failure";
import { Button } from "../components/ui/button";
import { SessionEditForm } from "./session-edit-form";
import { SessionRoster } from "./session-roster";
import { hasStarted, seatsTaken } from "./session-seats";
import { sessionRosterQueryOptions } from "./session-roster-queries";

type Session = AdministratorSessionAvailabilityDto;

// WEB-039: the class panel. Who booked and who waits come first; a class
// still to come adds «Reservar a una clienta» beside them (FIX-042, proposal
// A) and the edit form, a past one stays read-only.
export function SessionDetail({
  session,
  branchId,
  notice,
  onBook,
  onDone,
}: {
  session: Session;
  branchId: string;
  notice: string | null;
  onBook: () => void;
  onDone: (notice: string | null) => void;
}) {
  const roster = useQuery(sessionRosterQueryOptions(session.id));
  const past = hasStarted(session);
  const full =
    seatsTaken(session, roster.data?.bookings.length) >= session.capacity;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-5 px-7 py-4">
        {notice === null ? null : <PageNotice>{notice}</PageNotice>}
        {past ? (
          <p className="flex items-center gap-2 rounded-tarjeta bg-lino px-4 py-3 text-celda text-texto-secundario">
            <Lock size={16} aria-hidden="true" className="text-rosa-profundo" />
            Clase pasada: solo lectura.
          </p>
        ) : null}
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
          <SessionRoster
            roster={roster.data}
            action={
              past ? null : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onBook}
                  aria-label={
                    full
                      ? "Agregar a la lista de espera"
                      : "Reservar a una clienta"
                  }
                >
                  <UserPlus size={16} strokeWidth={1.8} aria-hidden="true" />
                  {full ? "Lista de espera" : "Reservar"}
                </Button>
              )
            }
          />
        )}
      </div>
      {past ? null : (
        <SessionEditForm
          key={session.id}
          session={session}
          branchId={branchId}
          onDone={onDone}
        />
      )}
    </div>
  );
}
