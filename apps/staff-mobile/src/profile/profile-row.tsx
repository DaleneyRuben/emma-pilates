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
 * A Perfil settings row (S23): `IconRow`'s shape with the unread count in
 * Rosa profundo, and «Cerrar sesión» as the Error last row (follow-up 225,
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
  valueTone,
}: {
  badge?: number;
  icon: GlyphName;
  label: string;
  onPress: () => void;
  testID?: string;
  tone?: "default" | "error";
  /** A short value before the chevron, such as the Trainer's code. */
  value?: string;
  /**
   * FIX-072: a payout QR's standing, in plain spacing (not a code), amber when
   * it expires soon and Error once expired.
   */
  valueTone?: "muted" | "warning" | "error";
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
      <View style={styles.disc}>
        <Glyph color={colors.text} name={icon} size={18} strokeWidth={1.5} />
      </View>
      <Text style={[styles.label, error && styles.errorLabel]}>{label}</Text>
      {badge > 0 ? (
        <View style={styles.badge} testID="notifications-row-badge">
          <Text style={styles.badgeLabel}>{badge > 9 ? "9+" : String(badge)}</Text>
        </View>
      ) : null}
      {value === undefined ? null : (
        <Text
          style={[
            styles.value,
            valueTone !== undefined && styles.plainValue,
            valueTone === "warning" && styles.warningValue,
            valueTone === "error" && styles.errorValue,
          ]}
        >
          {value}
        </Text>
      )}
      {error ? null : <Chevron size={16} strokeWidth={1.5} tone="muted" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // FIX-089: an unread count is the one badge kept, Rosa profundo with Crema.
  badge: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 24,
    justifyContent: "center",
    minWidth: 24,
    paddingHorizontal: spacing.sm,
  },
  badgeLabel: {
    color: colors.onPrimary,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: 13,
    fontWeight: "600",
  },
  // FIX-089: the icon stands alone, with no tinted disc behind it.
  disc: { alignItems: "center", justifyContent: "center", width: 24 },
  errorLabel: { color: colors.text, fontFamily: fontFamilies.bodyMedium, fontWeight: "500" },
  label: { color: colors.text, flex: 1, fontFamily: fontFamilies.body, fontSize: 16 },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  errorValue: { color: colors.error, fontFamily: fontFamilies.bodyStrong, fontWeight: "600" },
  plainValue: { letterSpacing: 0 },
  warningValue: { color: colors.warningText, fontFamily: fontFamilies.bodyMedium },
  value: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    letterSpacing: 1.1,
  },
});
