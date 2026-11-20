import type { TrainerScheduleSessionDto } from "@pilates/api-contracts";
import {
  CancelledFold,
  ClassList,
  ClassRow,
  formatTimeRange,
  placesLabel,
  spacing,
} from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";

import { SessionRow } from "../ui/session-row";
import { minutesLabel, startTime } from "../ui/session-time";
import { causeLabel, cancelledReason } from "./agenda-cancellations";
import { TodayHero } from "../ui/today-hero";
import { splitNextClass } from "./next-class";

/**
 * One day of Mi agenda (ClaseE, FIX-089): today's next class as the Palo de
 * rosa hero with who is coming by initials (E1 B), the day's other classes as rows of one card, and the cancelled ones
 * folded at the end. A cancelled class opens nothing: no attendance to take.
 */
export function AgendaDay({
  isToday = true,
  now,
  onOpen,
  sessions,
}: {
  /** Another day keeps rows only. */
  isToday?: boolean;
  now: Date;
  onOpen: (sessionId: string) => void;
  sessions: readonly TrainerScheduleSessionDto[];
}) {
  const standing = sessions.filter((session) => (session.cancellation ?? null) === null);
  const cancelled = sessions.filter((session) => (session.cancellation ?? null) !== null);
  const { next, rest: others } = splitNextClass(standing, isToday, now);
  const label = (session: TrainerScheduleSessionDto) =>
    `${session.classTypeName}, ${formatTimeRange(session.startsAt, session.endsAt)}, ${session.branchName}, ${placesLabel(session.bookedCount, session.capacity)}`;

  return (
    <View style={styles.day}>
      {next === undefined ? null : (
        <TodayHero
          accessibilityLabel={label(next)}
          attendees={next.attendeeInitials}
          detail={`${next.branchName} · ${minutesLabel(next.startsAt, next.endsAt)}`}
          now={now}
          onPress={() => onOpen(next.sessionId)}
          places={placesLabel(next.bookedCount, next.capacity)}
          startsAt={next.startsAt}
          testID={`agenda-session-${next.sessionId}`}
          title={`${startTime(next.startsAt, next.endsAt)} · ${next.classTypeName}`}
        />
      )}
      {others.length === 0 ? null : (
        <ClassList>
          {others.map((session) => (
            <SessionRow
              accessibilityLabel={label(session)}
              key={session.sessionId}
              onPress={() => onOpen(session.sessionId)}
              places={placesLabel(session.bookedCount, session.capacity)}
              subtitle={session.branchName}
              testID={`agenda-session-${session.sessionId}`}
              time={startTime(session.startsAt, session.endsAt)}
              title={session.classTypeName}
            />
          ))}
        </ClassList>
      )}
      <CancelledFold count={cancelled.length} reason={cancelledReason(cancelled)}>
        <ClassList testID="agenda-cancelled-list">
          {cancelled.map((session) => {
            const cause = causeLabel(session.cancellation?.cause ?? "studio");
            return (
              <ClassRow
                accessibilityLabel={`${session.classTypeName}, ${formatTimeRange(session.startsAt, session.endsAt)}, ${cause}`}
                detail={cause}
                key={session.sessionId}
                testID={`agenda-cancelled-${session.sessionId}`}
                time={startTime(session.startsAt, session.endsAt)}
                title={session.classTypeName}
              />
            );
          })}
        </ClassList>
      </CancelledFold>
    </View>
  );
}

const styles = StyleSheet.create({
  day: { gap: spacing.md },
});
