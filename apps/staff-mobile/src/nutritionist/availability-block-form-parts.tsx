import { agendaDayChipLabel, chipStyles, radii, spacing, Text } from "@pilates/mobile-core";
import { Pressable, StyleSheet } from "react-native";

const blockProblems: Record<string, string> = {
  availability_block_overlap: "Se superpone con otro de tus horarios.",
  availability_block_invalid_range:
    "Revisa las horas: el horario debe durar al menos 45 minutos, en tramos de 15.",
  availability_block_effective_date_past: "Elige hoy o una fecha posterior.",
  availability_block_ended: "Este horario ya termina antes de esa fecha.",
  availability_block_not_found: "Este horario ya no existe.",
  branch_not_assigned: "Ya no tienes asignada esa sucursal.",
};

export const saveFailureMessage = "No pudimos guardar el horario. Inténtalo de nuevo.";

export const problemMessage = (body: unknown): string => {
  const code =
    typeof body === "object" && body !== null ? (body as { code?: unknown }).code : undefined;
  return (typeof code === "string" ? blockProblems[code] : undefined) ?? saveFailureMessage;
};

export const keptLine = (count: number): string =>
  count === 1
    ? "La evaluación ya reservada se mantiene."
    : `Las ${count} evaluaciones ya reservadas se mantienen.`;

export function Pill({
  label,
  onPress,
  selected,
  accessibilityLabel = label,
  fill = false,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  accessibilityLabel?: string;
  /** S17's «Día» grid: the tiles share the row instead of wrapping. */
  fill?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      // The 38–40 pt tiles reach 44 with the slop.
      hitSlop={{ bottom: 3, left: 0, right: 0, top: 3 }}
      onPress={onPress}
      style={[styles.pill, chipStyles.box, fill && styles.fill, selected && chipStyles.boxSelected]}
    >
      {/* The same `compacto` chosen or not: only the ground and the tone change. */}
      <Text tone={selected ? "onDark" : "ink"} variant="compacto">
        {label}
      </Text>
    </Pressable>
  );
}

/** S17's «A partir del» tile: the weekday (or «Hoy») over the `cifra` day number. */
export function DateTile({
  accessibilityLabel,
  date,
  onPress,
  selected,
  today,
}: {
  accessibilityLabel: string;
  date: string;
  onPress: () => void;
  selected: boolean;
  today: string;
}) {
  const { weekday, day } = agendaDayChipLabel(date);
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.tile, chipStyles.box, selected && chipStyles.boxSelected]}
    >
      <Text tone={selected ? "onDark" : "ink"} variant="pastilla">
        {date === today ? "Hoy" : weekday.toLowerCase()}
      </Text>
      <Text tone={selected ? "onDark" : "ink"} variant="cifra">
        {day}
      </Text>
    </Pressable>
  );
}

export const pillRow = { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm } as const;

// Boards N07–N08: the day tiles are 40 tall with radius 12; the date tiles 48
// wide; both keep palette B's chosen and outlined looks.
const styles = StyleSheet.create({
  pill: {
    alignItems: "center",
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 38,
    minWidth: 48,
    paddingHorizontal: spacing.mdLg,
  },
  fill: { borderRadius: 12, flex: 1, minHeight: 40, minWidth: 0, paddingHorizontal: 0 },
  tile: {
    alignItems: "center",
    borderRadius: 12,
    gap: spacing.xxs,
    height: 60,
    justifyContent: "center",
    width: 48,
  },
});
