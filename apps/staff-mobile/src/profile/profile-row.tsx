import {
  Chevron,
  colors,
  fontFamilies,
  Glyph,
  type GlyphName,
  radii,
  spacing,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

/**
 * A Perfil settings row (S23): `IconRow`'s shape with the unread count as a
 * Rosa tinte pill, and «Cerrar sesión» as the Error last row (follow-up 225,
 * walkthrough 19) instead of a separate button.
 */
export function ProfileRow({
  badge = 0,
  icon,
  label,
  onPress,
  testID,
  tone = "default",
  value,
}: {
  badge?: number;
  icon: GlyphName;
  label: string;
  onPress: () => void;
  testID?: string;
  tone?: "default" | "error";
  /** A short value before the chevron, such as the Trainer's code. */
  value?: string;
}) {
  const error = tone === "error";
  return (
    <Pressable
      accessibilityLabel={
        badge > 0
          ? `${label}, ${badge} ${badge === 1 ? "notificación sin leer" : "notificaciones sin leer"}`
          : value === undefined
            ? label
            : `${label}, ${value}`
      }
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      testID={testID}
    >
      <View style={[styles.disc, error && styles.errorDisc]}>
        <Glyph
          color={error ? colors.error : colors.primary}
          name={icon}
          size={18}
          strokeWidth={1.5}
        />
      </View>
      <Text style={[styles.label, error && styles.errorLabel]}>{label}</Text>
      {badge > 0 ? (
        <View style={styles.badge} testID="notifications-row-badge">
          <Text style={styles.badgeLabel}>{badge > 9 ? "9+" : String(badge)}</Text>
        </View>
      ) : null}
      {value === undefined ? null : <Text style={styles.value}>{value}</Text>}
      {error ? null : <Chevron size={16} strokeWidth={1.5} tone="muted" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 24,
    justifyContent: "center",
    minWidth: 24,
    paddingHorizontal: spacing.sm,
  },
  badgeLabel: {
    color: colors.primaryOnTint,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 13,
    fontWeight: "600",
  },
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  errorDisc: { backgroundColor: colors.errorSurface },
  errorLabel: { color: colors.error, fontFamily: fontFamilies.bodyMedium, fontWeight: "500" },
  label: { color: colors.text, flex: 1, fontFamily: fontFamilies.body, fontSize: 16 },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  value: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    letterSpacing: 1.1,
  },
});
