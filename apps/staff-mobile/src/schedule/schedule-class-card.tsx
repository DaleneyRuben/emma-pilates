import type { SessionAvailabilityDto } from "@pilates/api-contracts";
import {
  CancelledFold,
  ClassList,
  ClassRow,
  formatTimeRange,
  placesLabel,
  StaffFace,
} from "@pilates/mobile-core";

import { cancelledReason, causeLabel } from "../trainer/agenda-cancellations";
import { minutesLabel, startTime } from "../ui/session-time";
import { SessionRow } from "../ui/session-row";
import { TodayHero } from "../ui/today-hero";

/** Today's next class on Horario (ClaseE): read-only, so it opens nothing. */
export function ScheduleNextClass({
  now,
  session,
}: {
  now: Date;
  session: SessionAvailabilityDto;
}) {
  const full = session.availableSeats === 0;
  const places = placesLabel(session.bookedCount, session.capacity);
  const minutes = minutesLabel(session.startsAt, session.endsAt);
  const waitlist = session.waitlistCount > 0 ? ` · ${session.waitlistCount} en espera` : "";
  return (
    <TodayHero
      accessibilityLabel={`${startTime(session.startsAt, session.endsAt)}, ${session.classTypeName} con ${session.trainerName}, ${full ? "Completa" : places}, ${minutes}${waitlist.replace(" ·", ",")}`}
      detail={`${session.branchName} · ${session.trainerName} · ${minutes}${waitlist}`}
      now={now}
      places={full ? "Completa" : places}
      startsAt={session.startsAt}
      testID={`schedule-session-${session.id}`}
      title={`${startTime(session.startsAt, session.endsAt)} · ${session.classTypeName}`}
    />
  );
}

/**
 * FIX-083 (Horario pick A) on the shared class row (ClaseE, FIX-089): the
 * start, the class over its Trainer and length, the places «N de M»; a full
 * class is the one exception and takes the pill.
 */
export function ScheduleClassRow({
  fetcher,
  session,
}: {
  fetcher: typeof globalThis.fetch;
  session: SessionAvailabilityDto;
}) {
  const time = startTime(session.startsAt, session.endsAt);
  const full = session.availableSeats === 0;
  const places = placesLabel(full ? session.capacity : session.bookedCount, session.capacity);
  const minutes = minutesLabel(session.startsAt, session.endsAt);
  const waitlist = session.waitlistCount > 0 ? ` · ${session.waitlistCount} en espera` : "";
  return (
    <SessionRow
      accessibilityLabel={`${time}, ${session.classTypeName} con ${session.trainerName}, ${full ? "Completa" : places}, ${minutes}${waitlist.replace(" ·", ",")}`}
      exception={full ? "Completa" : undefined}
      places={places}
      subtitle={`${session.trainerName} · ${minutes}${waitlist}`}
      subtitleLead={
        <StaffFace
          fetcher={fetcher}
          name={session.trainerName}
          photo={session.trainerPhoto}
          size={20}
        />
      }
      testID={`schedule-session-${session.id}`}
      time={time}
      title={session.classTypeName}
    />
  );
}

/** The day's cancelled classes, folded into one line at the end until opened. */
export function ScheduleCancelledFold({
  sessions,
}: {
  sessions: readonly SessionAvailabilityDto[];
}) {
  return (
    <CancelledFold
      count={sessions.length}
      reason={cancelledReason(sessions)}
      testID="schedule-cancelled-fold"
    >
      <ClassList testID="schedule-cancelled-list">
        {sessions.map((session) => {
          const cause = causeLabel(session.cancellation?.cause ?? "studio");
          return (
            <ClassRow
              accessibilityLabel={`${session.classTypeName}, ${formatTimeRange(session.startsAt, session.endsAt)}, ${cause}`}
              detail={cause}
              key={session.id}
              testID={`schedule-cancelled-${session.id}`}
              time={startTime(session.startsAt, session.endsAt)}
              title={session.classTypeName}
            />
          );
        })}
      </ClassList>
    </CancelledFold>
  );
}
