import { useEffect, useEffectEvent } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Glyph } from "./glyph";
import { Text } from "./text";
import { colors, radii, shadows, spacing } from "./tokens";

/**
 * Walkthrough n.º 10 (C19d, E-F15): «Notificación borrada» with «Deshacer»
 * on the 600 ground, over the tab bar. It leaves by itself after a few
 * seconds; render it as the last child of the `Screen`.
 */
export function UndoToast({
  actionLabel = "Deshacer",
  durationMs = 5000,
  onAction,
  onExpire,
  title,
}: {
  actionLabel?: string;
  durationMs?: number;
  onAction: () => void;
  onExpire: () => void;
  title: string;
}) {
  const expire = useEffectEvent(onExpire);
  useEffect(() => {
    const timer = setTimeout(() => expire(), durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, title]);

  return (
    <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.toast}>
      <Glyph color={colors.onEmphasis} name="check" size={20} strokeWidth={1.8} />
      <Text style={styles.title} tone="onDark" variant="titulo-fila">
        {title}
      </Text>
      <Pressable
        accessibilityLabel={actionLabel}
        accessibilityRole="button"
        hitSlop={spacing.sm}
        onPress={onAction}
      >
        <Text tone="onDark" variant="enlace-secundario">
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { flex: 1 },
  toast: {
    ...shadows.hero,
    alignItems: "center",
    backgroundColor: colors.emphasis,
    borderRadius: radii.card - 4,
    bottom: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    left: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    position: "absolute",
    right: spacing.lg,
  },
});
