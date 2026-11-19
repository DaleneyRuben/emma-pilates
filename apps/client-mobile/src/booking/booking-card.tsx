import type { UpcomingBookingDto } from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  CardActionRow,
  cardWithActionRow,
  colors,
  dayChipLabel,
  fontFamilies,
  formatCancellationWindow,
  formatSessionDate,
  formatStartTime,
  formatTimeRange,
  IconRow,
  IconRowGroup,
  isInsideCancellationWindow,
  radii,
  spacing,
  StaffFace,
  surfaces,
  typography,
  useMountedAt,
} from "@pilates/mobile-core";
import { StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";

/**
 * «08:00 – 09:00 · Daniela Ortiz · Achumani» with her 20 px face right before
 * her name (FIX-041, follow-up 242); a wrapped line keeps the face with her name.
 */
function TrainerDetails({ item, time }: { item: UpcomingBookingDto; time: string }) {
  const fetcher = useClientFetcher();
  return (
    <View style={styles.detailsLine}>
      <Text style={styles.details}>{`${time} ·`}</Text>
      <View style={styles.trainer}>
        <StaffFace fetcher={fetcher} name={item.trainerName} photo={item.trainerPhoto} size={20} />
        <Text style={styles.details}>{item.trainerName}</Text>
      </View>
      <Text style={styles.details}>{`· ${item.branchName}`}</Text>
    </View>
  );
}

export function DayTile({ startsAt, today }: { startsAt: string; today: string }) {
  const civil = boliviaCivilDate(new Date(startsAt));
  const day = dayChipLabel(civil);
  return (
    <View style={styles.day}>
      <Text style={styles.weekday}>{civil === today ? "Hoy" : day.weekday}</Text>
      <Text style={styles.dayNumber}>{day.day}</Text>
    </View>
  );
}

type BookingAction = {
  label: string;
  onPress: () => void;
  testID: string;
};

/**
 * What a booking offers: leaving the waitlist, rescheduling inside the
 * Cancellation Window, or cancelling outside it. Until the window is known
 * (a Studio Setting, BKM-004) a booking offers neither rather than guess.
 */
export function useBookingAction({
  cancellationWindowMinutes,
  item,
  onCancel,
  onLeave,
  onReschedule,
}: {
  cancellationWindowMinutes: number | undefined;
  item: UpcomingBookingDto;
  onCancel: () => void;
  onLeave: () => void;
  onReschedule: () => void;
}): { action: BookingAction | null; insideWindow: boolean } {
  const mountedAt = useMountedAt();
  const windowKnown = cancellationWindowMinutes !== undefined;
  const insideWindow =
    item.kind === "booking" &&
    windowKnown &&
    isInsideCancellationWindow(item.startsAt, new Date(mountedAt), cancellationWindowMinutes);
  const action =
    item.kind === "waitlist"
      ? {
          label: "Salir de la lista de espera",
          onPress: onLeave,
          testID: `booking-leave-waitlist-${item.waitlistEntryId}`,
        }
      : !windowKnown
        ? null
        : insideWindow
          ? {
              label: "Reprogramar",
              onPress: onReschedule,
              testID: `booking-reschedule-${item.bookingId}`,
            }
          : {
              label: "Cancelar reserva",
              onPress: onCancel,
              testID: `booking-cancel-${item.bookingId}`,
            };
  return { action, insideWindow };
}

/**
 * A booking card (follow-ups 225 §9 and 226, palette B): the day tile, the
 * class in Lora 20 over one line of details, then the action as a text
 * button. Cancelling is the secondary look and asks first (FIX-089); a
 * waitlist place is said in words, not a pill.
 */
export function BookingCard({
  cancellationWindowMinutes,
  item,
  onCancel,
  onLeave,
  onReschedule,
}: {
  cancellationWindowMinutes: number | undefined;
  item: UpcomingBookingDto;
  onCancel: () => void;
  onLeave: () => void;
  onReschedule: () => void;
}) {
  const mountedAt = useMountedAt();
  const today = boliviaCivilDate(new Date(mountedAt));
  const { action, insideWindow } = useBookingAction({
    cancellationWindowMinutes,
    item,
    onCancel,
    onLeave,
    onReschedule,
  });
  const time = formatTimeRange(item.startsAt, item.endsAt);

  return (
    <View style={[styles.card, action !== null && cardWithActionRow]}>
      <View style={styles.header}>
        <DayTile startsAt={item.startsAt} today={today} />
        <View style={styles.body}>
          <Text style={styles.title}>{item.classTypeName}</Text>
          {item.kind === "waitlist" ? (
            <Text style={styles.waitlist}>En lista de espera</Text>
          ) : null}
          {insideWindow && cancellationWindowMinutes !== undefined ? (
            <Text style={styles.details}>
              {`${time} · faltan menos de ${formatCancellationWindow(cancellationWindowMinutes)}`}
            </Text>
          ) : (
            <TrainerDetails item={item} time={time} />
          )}
        </View>
      </View>
      {action === null ? null : <CardActionRow {...action} />}
    </View>
  );
}

/** C05c's facts inside the cancel sheet: the class, then that it returns to the Plan. */
export function CancelBookingFacts({ booking }: { booking: UpcomingBookingDto }) {
  const date = formatSessionDate(booking.startsAt).split(" ").slice(0, 2).join(" ");
  return (
    <IconRowGroup>
      <View style={styles.factRow}>
        <IconRow
          icon="calendar"
          label={`${booking.classTypeName} · ${date}, ${formatStartTime(booking.startsAt)}`}
        />
        <Text style={styles.factNote}>{`${booking.trainerName} · ${booking.branchName}`}</Text>
      </View>
      <IconRow icon="undo" label="La clase vuelve a tu plan" />
    </IconRowGroup>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs },
  card: { ...surfaces.card, gap: spacing.sm, padding: spacing.lg },
  day: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.button,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  dayNumber: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 20 },
  details: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  detailsLine: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  factNote: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    marginLeft: 64,
    marginTop: -spacing.sm,
    paddingBottom: spacing.sm,
  },
  factRow: {},
  header: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  title: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 20 },
  trainer: { alignItems: "center", flexDirection: "row", gap: spacing.xs },
  waitlist: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.note,
    fontWeight: "600",
  },
  weekday: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.label,
    fontWeight: "600",
    textTransform: "uppercase",
  },
});
