import {
  getListSessionAvailabilityQueryKey,
  useListSessionAvailability,
  type SessionAvailabilityDto,
} from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  civilDateRange,
  LoadingState,
  placesLabel,
  QueryFailure,
  spacing,
  surfaces,
  Text,
  useRefetchOnFocus,
} from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { RowCard } from "../ui/card-pieces";
import { ScheduleClassRow } from "../schedule/schedule-class-card";
import { useStaffFetcher } from "../staff-fetcher";
import { splitNextClass } from "../trainer/next-class";
import { minutesLabel, startTime } from "../ui/session-time";
import { TodayHero } from "../ui/today-hero";

function NextClass({ now, session }: { now: Date; session: SessionAvailabilityDto }) {
  const full = session.availableSeats === 0;
  const places = full ? "Completa" : placesLabel(session.bookedCount, session.capacity);
  const minutes = minutesLabel(session.startsAt, session.endsAt);
  const time = startTime(session.startsAt, session.endsAt);
  return (
    <TodayHero
      accessibilityLabel={`${time}, ${session.classTypeName} con ${session.trainerName}, ${places}, ${minutes}`}
      attendees={session.attendeeInitials ?? []}
      detail={`${session.trainerName} · ${minutes}`}
      now={now}
      places={places}
      startsAt={session.startsAt}
      testID={`today-session-${session.id}`}
      title={`${time} · ${session.classTypeName}`}
    />
  );
}

/**
 * E7 pick A: today's next class at the Branch as the 600 hero with who is
 * coming, the `pending` rows, then the «Más tarde» card with the classes after it.
 */
export function TodayAgenda({ branchId, pending }: { branchId: string; pending: ReactNode }) {
  const fetcher = useStaffFetcher();
  const { from, until } = civilDateRange(boliviaCivilDate(new Date()));
  const sessions = useListSessionAvailability(
    { branchId, from, until, limit: 100, includeAttendees: true },
    { fetcher, query: { refetchOnMount: "always" } },
  );
  useRefetchOnFocus([getListSessionAvailabilityQueryKey()]);

  // The pending rows always follow the lead, whatever the classes' state.
  const frame = (lead: ReactNode, after: ReactNode = null) => (
    <View style={styles.agenda}>
      {lead}
      {pending}
      {after}
    </View>
  );
  if (sessions.isPending) return frame(<LoadingState label="Cargando las clases de hoy" />);
  if (sessions.isError || sessions.data.status !== 200) {
    return frame(
      <QueryFailure
        label="No pudimos cargar las clases de hoy."
        onRetry={() => void sessions.refetch()}
      />,
    );
  }
  const now = new Date();
  const { next, rest } = splitNextClass(sessions.data.data, true, now);
  if (next === undefined) {
    return frame(
      <View style={styles.emptyCard}>
        <Text style={styles.empty} variant="cuerpo">
          Hoy no quedan clases en esta sucursal.
        </Text>
      </View>,
    );
  }
  const later = rest.filter((session) => new Date(session.startsAt) > new Date(next.startsAt));
  return frame(
    <NextClass now={now} session={next} />,
    later.length === 0 ? null : (
      <RowCard label="Más tarde" testID="today-later">
        {later.map((session) => (
          <ScheduleClassRow fetcher={fetcher} key={session.id} session={session} />
        ))}
      </RowCard>
    ),
  );
}

const styles = StyleSheet.create({
  agenda: { gap: spacing.md },
  // E-S02: the quiet sentence is `cuerpo` on its own white card, never Lora.
  empty: { textAlign: "center" },
  emptyCard: { ...surfaces.card, paddingHorizontal: spacing.xlSm, paddingVertical: spacing.xl },
});
