import type { TrainerRosterBookingDto } from "@pilates/api-contracts";
import {
  chipStyles,
  ClientFace,
  colors,
  ExceptionPill,
  radii,
  spacing,
  Text,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, View } from "react-native";

import { PersonRow } from "../ui/person-row";

export type AttendanceOutcome = "attended" | "no_show";

const isFirstClass = (booking: TrainerRosterBookingDto) => booking.classNumber === 1;

/** «12.ª clase»; undefined for a first class, which has its own note. */
function classOrdinal(booking: TrainerRosterBookingDto): string | undefined {
  return booking.classNumber === undefined || isFirstClass(booking)
    ? undefined
    : `${booking.classNumber}.ª clase`;
}

/** How many of the roster come to their first class (E6 B). */
export const countNewClients = (bookings: readonly TrainerRosterBookingDto[]): number =>
  bookings.filter(isFirstClass).length;

/** «Quién viene» (E6 B): her face, her class number, a note for a first class. */
export function ComingRow({
  booking,
  fetcher,
}: {
  booking: TrainerRosterBookingDto;
  fetcher: typeof globalThis.fetch;
}) {
  const first = isFirstClass(booking);
  return (
    <PersonRow
      detail={first ? "Primera clase: explícale el método" : classOrdinal(booking)}
      face={
        <ClientFace
          fetcher={fetcher}
          name={booking.clientName}
          photo={booking.clientPhoto}
          size={40}
        />
      }
      name={booking.clientName}
      testID={`roster-coming-${booking.bookingId}`}
      trailing={first ? <NewPill /> : undefined}
    />
  );
}

/** Board I05: «Nueva» is the list's one solid 600 pill. */
function NewPill() {
  return (
    <View style={styles.newPill}>
      <Text tone="onDark" variant="pastilla">
        Nueva
      </Text>
    </View>
  );
}

const choices = [
  { outcome: "attended", label: "Vino" },
  { outcome: "no_show", label: "No vino" },
] as const;

/** One Client while taking attendance (E6 A): «Vino» / «No vino». */
export function AttendanceRow({
  booking,
  fetcher,
  onChoose,
  outcome,
}: {
  booking: TrainerRosterBookingDto;
  fetcher: typeof globalThis.fetch;
  onChoose: (outcome: AttendanceOutcome) => void;
  outcome: AttendanceOutcome | undefined;
}) {
  const ordinal = classOrdinal(booking);
  return (
    <View style={styles.row} testID={`roster-attendance-${booking.bookingId}`}>
      <ClientFace
        fetcher={fetcher}
        name={booking.clientName}
        photo={booking.clientPhoto}
        size={36}
      />
      <View style={styles.body}>
        <Text variant="titulo-fila">{booking.clientName}</Text>
        {isFirstClass(booking) ? <ExceptionPill>Primera clase</ExceptionPill> : null}
        {/* Board I06: her class number rides the same soft tag. */}
        {ordinal === undefined ? null : (
          <ExceptionPill testID="roster-class-number">{ordinal}</ExceptionPill>
        )}
      </View>
      <View style={styles.choices}>
        {choices.map((choice) => {
          const selected = outcome === choice.outcome;
          return (
            <Pressable
              accessibilityLabel={`${booking.clientName}: ${choice.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              hitSlop={{ bottom: 4, left: 0, right: 0, top: 4 }}
              key={choice.outcome}
              onPress={() => onChoose(choice.outcome)}
              style={[styles.choice, chipStyles.box, selected && chipStyles.boxSelected]}
              testID={`roster-${choice.outcome}-${booking.bookingId}`}
            >
              <Text tone={selected ? "onDark" : "ink"} variant="compacto">
                {choice.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xs, minWidth: 0 },
  choice: {
    alignItems: "center",
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.mdLg,
  },
  choices: { flexDirection: "row", gap: spacing.smd },
  newPill: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 28,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
