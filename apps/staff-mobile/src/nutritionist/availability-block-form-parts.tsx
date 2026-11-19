import {
  agendaDayChipLabel,
  chipStyles,
  colors,
  fontFamilies,
  radii,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text } from "react-native";

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
      onPress={onPress}
      style={[styles.pill, chipStyles.box, fill && styles.fill, selected && chipStyles.boxSelected]}
    >
      <Text style={[chipStyles.label, selected && chipStyles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

/** S17's «A partir del» tile: the weekday (or «Hoy») over the Lora day number. */
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
      <Text style={[styles.tileWeekday, selected && chipStyles.labelSelected]}>
        {date === today ? "Hoy" : weekday.toLowerCase()}
      </Text>
      <Text style={[styles.tileDay, selected && styles.tileDaySelected]}>{day}</Text>
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

export const pillRow = { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm } as const;

const styles = StyleSheet.create({
  // S17's 12 pt section title; the chips are palette B's (FIX-089).
  label: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontWeight: "500",
    letterSpacing: typography.label * 0.12,
    marginTop: spacing.md,
    textTransform: "uppercase",
  },
  pill: {
    alignItems: "center",
    borderRadius: radii.button,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 48,
    paddingHorizontal: spacing.md,
  },
  fill: { flex: 1, minWidth: 0, paddingHorizontal: 0 },
  tile: {
    alignItems: "center",
    borderRadius: 14,
    gap: spacing.xxs,
    height: 60,
    justifyContent: "center",
    width: 52,
  },
  tileDay: { color: colors.text, fontFamily: fontFamilies.display, fontSize: 18 },
  tileDaySelected: { color: colors.onPrimary },
  tileWeekday: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 12,
    fontWeight: "500",
  },
});
