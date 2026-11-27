import {
  Chevron,
  colors,
  Glyph,
  type GlyphName,
  radii,
  rosa,
  spacing,
  Text,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, View } from "react-native";

/**
 * A Perfil row (S23, walkthrough n.º 16 after the Client's C18): the line
 * glyph on a 36 pt 50 disc, the label in `titulo-fila`, the unread count in
 * Rosa profundo or a short value, and the chevron.
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
  /**
   * FIX-072: marks the value as a payout QR's standing. Kept for callers: the
   * standing is said in words, in the one ink and the same `compacto` as any
   * other value (follow-up 285).
   */
  valueTone?: "muted" | "warning" | "error";
}) {
  const error = tone === "error";
  const content = (
    <>
      <View style={styles.disc} testID="profile-row-disc">
        <Glyph color={colors.text} name={icon} size={18} strokeWidth={1.6} />
      </View>
      {/* Follow-up 293: a row is its label alone, with no line under it. */}
      <Text style={styles.label} variant="titulo-fila">
        {label}
      </Text>
      {badge > 0 ? (
        <View style={styles.badge} testID="notifications-row-badge">
          <Text allowFontScaling={false} tone="onDark" variant="pastilla">
            {badge > 9 ? "9+" : String(badge)}
          </Text>
        </View>
      ) : null}
      {value === undefined ? null : (
        // E-F01: the value, a code or a standing, in `compacto` with no hand-made spacing.
        <Text style={styles.value} variant="compacto">
          {value}
        </Text>
      )}
      {error ? null : <Chevron size={16} strokeWidth={1.5} tone="muted" />}
    </>
  );
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
      {content}
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
  // Walkthrough n.º 16 (E-F01): the Client's 36 pt disc on 50.
  disc: {
    alignItems: "center",
    backgroundColor: rosa[50],
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  // E-F01: the row's label takes the room; its value keeps to 60 percent.
  label: { flex: 1 },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  value: { flexShrink: 1, maxWidth: "60%" },
});
