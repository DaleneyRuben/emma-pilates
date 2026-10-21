import { colors, radii, spacing, typography } from "@pilates/mobile-core";
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
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.pill, selected && styles.pillSelected]}
    >
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

export const pillRow = { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm } as const;

const styles = StyleSheet.create({
  label: {
    color: colors.textMuted,
    fontSize: typography.label,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    textTransform: "uppercase",
  },
  pill: {
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.text, fontSize: typography.note },
  pillTextSelected: { color: colors.white },
});
