import type {
  AdministratorRosterBookingDto,
  AdministratorSessionRosterDto,
} from "@pilates/api-contracts";
import { useId } from "react";

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

const rowClass =
  "flex min-h-[44px] items-center gap-3 px-4 py-2 text-celda text-texto";

function BookedRow({ booking }: { booking: AdministratorRosterBookingDto }) {
  const outcome =
    booking.attendanceOutcome === null
      ? undefined
      : attendance[booking.attendanceOutcome];
  return (
    <li className={rowClass}>
      <span className="flex-1 font-medium">{booking.clientName}</span>
      {outcome === undefined ? null : (
        <span className="text-ayuda text-texto-tenue">{outcome}</span>
      )}
    </li>
  );
}

// WEB-039 (board P02, the class panel): who booked, then the Waitlist in
// queue order. Names only: the panel never shows a plan or an amount.
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
          <ul className="divide-y divide-divisor rounded-tarjeta bg-lino">
            {roster.bookings.map((booking) => (
              <BookedRow key={booking.bookingId} booking={booking} />
            ))}
          </ul>
        )}
      </RosterSection>
      {roster.waitlist.length === 0 ? null : (
        <RosterSection title={`Lista de espera (${roster.waitlist.length})`}>
          <ol className="divide-y divide-divisor rounded-tarjeta bg-lino">
            {roster.waitlist.map((entry) => (
              <li key={entry.waitlistEntryId} className={rowClass}>
                <span className="w-6 font-serif text-[18px] text-rosa-profundo tabular">
                  {entry.position}
                </span>
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
