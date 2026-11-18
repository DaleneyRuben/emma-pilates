import type { SessionAvailabilityDto } from "@pilates/api-contracts";
import {
  Chevron,
  colors,
  fontFamilies,
  formatTimeRange,
  spacing,
  StaffFace,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { causeLabel } from "../trainer/agenda-cancellations";
import { CancelledSessionRow } from "../ui/cancelled-session-row";
import { countLabel, minutesLabel, startTime } from "../ui/session-time";

type Cause = NonNullable<SessionAvailabilityDto["cancellation"]>["cause"];

// «6 de 12 lugares», or «12 de 12 · lleno».
export function placesLabel(session: SessionAvailabilityDto): string {
  return session.availableSeats === 0
    ? `${session.capacity} de ${session.capacity} · lleno`
    : `${session.bookedCount} de ${session.capacity} lugares`;
}

const causeTails: Record<Cause, string> = {
  minimum_not_met: "por mínimo",
  schedule_paused: "en pausa",
  studio: "por el estudio",
};

// «2 canceladas por mínimo»; «3 canceladas» when the causes differ.
export function cancelledSummary(sessions: readonly SessionAvailabilityDto[]): string {
  const causes = new Set(sessions.map((session) => session.cancellation?.cause));
  const [only] = [...causes];
  const count = countLabel(sessions.length, "cancelada", "canceladas");
  return causes.size === 1 && only !== undefined ? `${count} ${causeTails[only]}` : count;
}

/**
 * FIX-083 (Horario pick A): the one class card every role sees: the start,
 * the places in grey, the class and its Trainer, and how long it lasts.
 */
export function ScheduleClassCard({
  fetcher,
  session,
}: {
  fetcher: typeof globalThis.fetch;
  session: SessionAvailabilityDto;
}) {
  const time = startTime(session.startsAt, session.endsAt);
  const places = placesLabel(session);
  const waitlist = session.waitlistCount > 0 ? ` · ${session.waitlistCount} en espera` : "";
  return (
    <View
      accessibilityLabel={`${time}, ${session.classTypeName} con ${session.trainerName}, ${places}, ${minutesLabel(session.startsAt, session.endsAt)}${waitlist.replace(" ·", ",")}`}
      accessible
      style={styles.card}
      testID={`schedule-session-${session.id}`}
    >
      <View style={styles.top}>
        <Text style={styles.time}>{time}</Text>
        <Text style={styles.quiet}>{places}</Text>
      </View>
      <View style={styles.line}>
        <StaffFace
          fetcher={fetcher}
          name={session.trainerName}
          photo={session.trainerPhoto}
          size={20}
        />
        <Text style={styles.title}>{`${session.classTypeName} · ${session.trainerName}`}</Text>
      </View>
      <Text style={styles.quiet}>
        {`${minutesLabel(session.startsAt, session.endsAt)}${waitlist}`}
      </Text>
    </View>
  );
}

/** The day's cancelled classes, folded into one line at the end until opened. */
export function CancelledFold({ sessions }: { sessions: readonly SessionAvailabilityDto[] }) {
  const [open, setOpen] = useState(false);
  if (sessions.length === 0) return null;
  const summary = cancelledSummary(sessions);
  return (
    <View style={styles.fold}>
      <Pressable
        accessibilityLabel={summary}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={styles.foldLine}
        testID="schedule-cancelled-fold"
      >
        <Text style={styles.foldLabel}>{summary}</Text>
        <View style={styles.foldAction}>
          <Text style={styles.foldLabel}>{open ? "Ocultar" : "Ver"}</Text>
          <Chevron direction={open ? "up" : "down"} size={14} strokeWidth={1.5} tone="muted" />
        </View>
      </Pressable>
      {open
        ? sessions.map((session) => {
            const cause = causeLabel(session.cancellation?.cause ?? "studio");
            return (
              <CancelledSessionRow
                accessibilityLabel={`${session.classTypeName}, ${formatTimeRange(session.startsAt, session.endsAt)}, ${cause}`}
                cause={cause}
                duration={minutesLabel(session.startsAt, session.endsAt)}
                key={session.id}
                testID={`schedule-cancelled-${session.id}`}
                time={startTime(session.startsAt, session.endsAt)}
                title={session.classTypeName}
              />
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...surfaces.card, gap: spacing.smd, padding: spacing.lg },
  fold: { borderTopColor: colors.border, borderTopWidth: 1, gap: spacing.md },
  foldAction: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  foldLabel: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 14 },
  foldLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  line: { alignItems: "center", flexDirection: "row", gap: spacing.smd },
  quiet: { color: colors.textSubtle, fontFamily: fontFamilies.body, fontSize: typography.note },
  time: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: typography.titleCard,
    fontVariant: ["tabular-nums"],
  },
  title: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
  },
  top: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between" },
});
