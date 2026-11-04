import { useQuery } from "@tanstack/react-query";
import { StatusPill } from "../../components/ui/status-pill";
import { formatCivilMoment } from "../../lib/bolivia-time";
import {
  clientBookingsQueryOptions,
  clientHistoryQueryOptions,
} from "./client-file-queries";
import { ClientFileItem, ClientFileSection } from "./client-file-list";

const detailOf = (item: {
  startsAt: string;
  trainerName: string;
  branchName: string;
}) =>
  `${formatCivilMoment(item.startsAt)} · ${item.trainerName} · ${item.branchName}`;

// P03 Reservas: her coming classes (the waitlist marked) and the classes she
// took. Booking her into a class stays on Horario (WEB-039).
export function ClientBookingsTab({ clientId }: { clientId: string }) {
  const bookings = useQuery(clientBookingsQueryOptions(clientId));
  const history = useQuery(clientHistoryQueryOptions(clientId));
  return (
    <>
      <ClientFileSection
        title="Próximas"
        query={bookings}
        what="sus reservas"
        loading="Cargando sus reservas…"
        empty="No tiene clases reservadas."
      >
        {(items) =>
          items.map((item) => (
            <ClientFileItem
              key={item.bookingId ?? item.waitlistEntryId ?? item.sessionId}
              title={item.classTypeName}
              detail={detailOf(item)}
              aside={
                item.kind === "waitlist" ? (
                  <StatusPill tone="advertencia">En espera</StatusPill>
                ) : undefined
              }
            />
          ))
        }
      </ClientFileSection>
      <ClientFileSection
        title="Historial"
        query={history}
        what="su historial"
        loading="Cargando su historial…"
        empty="Todavía no tomó ninguna clase."
      >
        {(items) =>
          items.map((item) => (
            <ClientFileItem
              key={item.bookingId}
              title={item.classTypeName}
              detail={detailOf(item)}
            />
          ))
        }
      </ClientFileSection>
    </>
  );
}
