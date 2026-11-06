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
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex min-h-9 items-center gap-3">
        <h3 id={id} className="flex-1 text-celda font-semibold text-texto">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const rowClass =
  "flex min-h-[44px] items-center gap-3 px-1 py-2 text-celda text-texto";

function BookedRow({ booking }: { booking: AdministratorRosterBookingDto }) {
  const outcome =
    booking.attendanceOutcome === null
      ? undefined
      : attendance[booking.attendanceOutcome];
  return (
    <li className={rowClass}>
      <ClientPhoto name={booking.clientName} photo={booking.clientPhoto} />
      <span className="flex-1 font-medium">{booking.clientName}</span>
      {outcome === undefined ? null : (
        <span className="text-ayuda text-texto-tenue">{outcome}</span>
      )}
    </li>
  );
}

// WEB-039 (board P02, the class panel): who booked, then the Waitlist in
// queue order. Names and faces only (FIX-041): the panel never shows a plan
// or an amount. FIX-042 (proposal A): plain lists, with the booking button
// beside the «Reservaron» title.
export function SessionRoster({
  roster,
  action,
}: {
  roster: AdministratorSessionRosterDto;
  action?: React.ReactNode;
}) {
  return (
    <>
      <RosterSection
        title={`Reservaron (${roster.bookings.length})`}
        action={action}
      >
        {roster.bookings.length === 0 ? (
          <p className="text-celda text-texto-tenue">Nadie reservó todavía.</p>
        ) : (
          <ul className="divide-y divide-divisor border-y border-divisor">
            {roster.bookings.map((booking) => (
              <BookedRow key={booking.bookingId} booking={booking} />
            ))}
          </ul>
        )}
      </RosterSection>
      {roster.waitlist.length === 0 ? null : (
        <RosterSection title={`Lista de espera (${roster.waitlist.length})`}>
          <ol className="divide-y divide-divisor border-y border-divisor">
            {roster.waitlist.map((entry) => (
              <li key={entry.waitlistEntryId} className={rowClass}>
                <span className="w-6 font-serif text-[18px] text-rosa-profundo tabular">
                  {entry.position}
                </span>
                <ClientPhoto
                  name={entry.clientName}
                  photo={entry.clientPhoto}
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
