import type {
  AdministratorRosterBookingDto,
  AdministratorSessionRosterDto,
} from "@pilates/api-contracts";
import { useId } from "react";
import { ClientPhoto } from "../components/client-photo";

const attendance: Record<string, string> = {
  attended: "Asistió",
  no_show: "No vino",
};

function RosterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h3 id={id} className="text-celda font-semibold text-texto">
        {title}
      </h3>
      {children}
    </section>
  );
}

// FIX-091 (W1, Editar clase A): one Crema card with Rubor dividers, each
// Client in her Palo de rosa circle.
const listClass =
  "divide-y divide-divisor rounded-tarjeta border border-borde bg-crema";
const rowClass =
  "flex min-h-[56px] items-center gap-3 px-4 py-2.5 text-celda text-texto";

function BookedRow({ booking }: { booking: AdministratorRosterBookingDto }) {
  const outcome =
    booking.attendanceOutcome === null
      ? undefined
      : attendance[booking.attendanceOutcome];
  return (
    <li className={rowClass}>
      <ClientPhoto
        name={booking.clientName}
        photo={booking.clientPhoto}
        size={40}
      />
      <span className="flex-1 font-medium">{booking.clientName}</span>
      {outcome === undefined ? null : (
        <span className="text-ayuda text-texto-tenue">{outcome}</span>
      )}
    </li>
  );
}

// WEB-039 (board P02, the class panel): who booked, then the Waitlist in
// queue order. Names and faces only (FIX-041): the panel never shows a plan
// or an amount.
export function SessionRoster({
  roster,
}: {
  roster: AdministratorSessionRosterDto;
}) {
  return (
    <>
      <RosterSection title={`Reservaron (${roster.bookings.length})`}>
        {roster.bookings.length === 0 ? (
          <p className="text-celda text-texto-tenue">Nadie reservó todavía.</p>
        ) : (
          <ul className={listClass}>
            {roster.bookings.map((booking) => (
              <BookedRow key={booking.bookingId} booking={booking} />
            ))}
          </ul>
        )}
      </RosterSection>
      {roster.waitlist.length === 0 ? null : (
        <RosterSection title={`Lista de espera (${roster.waitlist.length})`}>
          <ol className={listClass}>
            {roster.waitlist.map((entry) => (
              <li key={entry.waitlistEntryId} className={rowClass}>
                <span className="w-6 font-serif text-titulo-3 text-rosa-profundo tabular">
                  {entry.position}
                </span>
                <ClientPhoto
                  name={entry.clientName}
                  photo={entry.clientPhoto}
                  size={40}
                />
                <span className="flex flex-1 flex-col">
                  <span className="font-medium">{entry.clientName}</span>
                  <span className="text-ayuda text-texto-tenue">
                    Entra sola si se libera un lugar
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </RosterSection>
      )}
    </>
  );
}
