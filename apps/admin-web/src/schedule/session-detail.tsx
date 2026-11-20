import type { AdministratorSessionAvailabilityDto } from "@pilates/api-contracts";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { useId, useState } from "react";
import { PageNotice } from "../components/page/page-notice";
import { useEquipmentFlag } from "./equipment-flag-data";
import { EquipmentFlagNote } from "./equipment-flags";
import { branchSchedulesQueryOptions } from "./schedule-queries";
import { SeriesPauseNotice } from "./series-row";
import { SessionBookingsTab } from "./session-bookings-tab";
import { SessionEditTab } from "./session-edit-tab";
import { sessionRosterQueryOptions } from "./session-roster-queries";
import { hasStarted, seatsTaken } from "./session-seats";
import { SessionSeriesTab } from "./session-series-tab";
import { SessionTabPanel, SessionTabs, type SessionTab } from "./session-tabs";

type Session = AdministratorSessionAvailabilityDto;

// WEB-039, FIX-091 (W1, Editar clase A): the class panel. What concerns the
// whole class (a notice, missing Equipment, a paused series) sits on top;
// below, the tabs Reservas (who booked and who waits, and booking a Client),
// Editar (this class alone, and cancelling it) and Serie semanal (the rest of
// a weekly series, pausing and ending it; absent for a one-off class). A past
// class stays read-only: its bookings alone, with no tabs.
export function SessionDetail({
  session,
  branchId,
  notice,
  onBook,
  onDone,
  onClose,
}: {
  session: Session;
  branchId: string;
  notice: string | null;
  onBook: () => void;
  onDone: (notice: string | null) => void;
  onClose: () => void;
}) {
  const idBase = useId();
  const [tab, setTab] = useState<SessionTab>("reservas");
  const roster = useQuery(sessionRosterQueryOptions(session.id));
  const schedules = useQuery({
    ...branchSchedulesQueryOptions(branchId),
    enabled: session.sessionScheduleId !== null,
  });
  const schedule = schedules.data?.find(
    (candidate) => candidate.id === session.sessionScheduleId,
  );
  const past = hasStarted(session);
  const flag = useEquipmentFlag(session.id);
  const booked = roster.data?.bookings.length ?? session.bookedCount;
  const full =
    seatsTaken(session, roster.data?.bookings.length) >= session.capacity;
  const tabs: { value: SessionTab; label: string }[] = [
    { value: "reservas", label: `Reservas · ${booked}` },
    { value: "editar", label: "Editar" },
    ...(session.sessionScheduleId === null
      ? []
      : [{ value: "serie" as const, label: "Serie semanal" }]),
  ];

  const bookings = (
    <SessionBookingsTab
      roster={roster}
      sessionId={session.id}
      branchId={branchId}
      full={full}
      past={past}
      onBook={onBook}
      onClose={onClose}
    />
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-5 px-7 pt-4 empty:hidden">
        {notice === null ? null : <PageNotice>{notice}</PageNotice>}
        {flag === undefined ? null : <EquipmentFlagNote flag={flag} />}
        {schedule === undefined || past ? null : (
          <SeriesPauseNotice schedule={schedule} />
        )}
        {past ? (
          <p className="flex items-center gap-2 rounded-tarjeta bg-superficie shadow-tarjeta px-4 py-3 text-celda text-texto">
            <Lock size={16} aria-hidden="true" className="text-rosa-600" />
            Clase pasada: solo lectura.
          </p>
        ) : null}
      </div>
      {past ? (
        bookings
      ) : (
        <>
          <div className="pt-4">
            <SessionTabs
              tabs={tabs}
              value={tab}
              onChange={setTab}
              idBase={idBase}
            />
          </div>
          <SessionTabPanel tab={tab} idBase={idBase}>
            {tab === "reservas" ? bookings : null}
            {tab === "editar" ? (
              <SessionEditTab
                session={session}
                branchId={branchId}
                onDone={onDone}
              />
            ) : null}
            {tab === "serie" ? (
              <SessionSeriesTab
                session={session}
                branchId={branchId}
                onDone={onDone}
              />
            ) : null}
          </SessionTabPanel>
        </>
      )}
    </div>
  );
}
