import { formatDateTime, type UpcomingBookingDto } from "@pilates/api-contracts";
import {
  boliviaCivilDate,
  CardActionRow,
  cardWithActionRow,
  colors,
  dayChipLabel,
  formatCancellationWindow,
  formatTimeRange,
  IconRow,
  IconRowGroup,
  isInsideCancellationWindow,
  radii,
  spacing,
  surfaces,
  Text,
  useMountedAt,
} from "@pilates/mobile-core";
import { StyleSheet, View } from "react-native";

export function DayTile({ startsAt, today }: { startsAt: string; today: string }) {
  const civil = boliviaCivilDate(new Date(startsAt));
  const day = dayChipLabel(civil);
  return (
    <View style={styles.day} testID="booking-day-tile">
      <Text variant="etiqueta">{civil === today ? "Hoy" : day.weekday}</Text>
      <Text variant="cifra">{day.day}</Text>
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
 * A booking card (follow-ups 225 §9 and 226, Rosa Emma C05): a white card
 * with the soft day tile, the class as a row title over one line of details, then the action as a text
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
          <Text variant="titulo-fila">{item.classTypeName}</Text>
          {item.kind === "waitlist" ? <Text variant="pastilla">En lista de espera</Text> : null}
          {insideWindow && cancellationWindowMinutes !== undefined ? (
            <Text variant="secundario">
              {`${time} · faltan menos de ${formatCancellationWindow(cancellationWindowMinutes)}`}
            </Text>
          ) : (
            // «08:00 – 09:00 · Daniela Ortiz · Achumani»: her name only (pick C).
            <Text variant="secundario">{`${time} · ${item.trainerName} · ${item.branchName}`}</Text>
          )}
        </View>
      </View>
      {action === null ? null : <CardActionRow {...action} />}
    </View>
  );
}

/** C05c's facts inside the cancel sheet: the class, then that it returns to the Plan. */
export function CancelBookingFacts({ booking }: { booking: UpcomingBookingDto }) {
  return (
    <IconRowGroup>
      <View style={styles.factRow}>
        <IconRow
          icon="calendar"
          label={`${booking.classTypeName} · ${formatDateTime(booking.startsAt)}`}
        />
        <Text
          style={styles.factNote}
          variant="secundario"
        >{`${booking.trainerName} · ${booking.branchName}`}</Text>
      </View>
      <IconRow icon="undo" label="La clase vuelve a tu plan" />
    </IconRowGroup>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs },
  card: {
    ...surfaces.card,
    gap: spacing.smLg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  day: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderColor: colors.borderSoft,
    borderRadius: radii.inset,
    borderWidth: 1,
    flexShrink: 0,
    height: 56,
    justifyContent: "center",
    width: 52,
  },
  factNote: {
    marginLeft: 64,
    marginTop: -spacing.sm,
    paddingBottom: spacing.sm,
  },
  factRow: {},
  header: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
});
