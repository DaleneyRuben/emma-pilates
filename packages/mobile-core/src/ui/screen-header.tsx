import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Polyline } from "react-native-svg";

import { fontFamilies } from "./fonts";
import { LineIcon } from "./line-icon";
import { colors, spacing, typography } from "./tokens";

/**
 * Every screen's header in both apps (EncabezadoA, FIX-089): the back arrow on
 * its own row, then the screen's own large Lora title — never the name of the
 * screen it was opened from. A tab's root screen omits `onBack`.
 */
export function ScreenHeader({
  action,
  fullBleed = false,
  onBack,
  subtitle,
  testID = "screen-header",
  title,
}: {
  /** A link at the end of the arrow's row, such as «Marcar leídas». */
  action?: ReactNode;
  /** Inside a padded `Screen`: span its padding. */
  fullBleed?: boolean;
  onBack?: () => void;
  /** One quiet line under the title. */
  subtitle?: string;
  testID?: string;
  /** Omitted only when the screen draws its own large title right below. */
  title?: string;
}) {
  const showRow = onBack !== undefined || action !== undefined;
  return (
    <View style={[styles.block, fullBleed && styles.fullBleed]} testID={testID}>
      {showRow ? (
        <View style={styles.row}>
          {onBack === undefined ? null : (
            <Pressable
              accessibilityLabel="Volver"
              accessibilityRole="button"
              onPress={onBack}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
              testID="back-bar"
            >
              {/* The glyph starts at the box's edge: a scroll view clips anything
                  pulled past its padding (MOB-074). */}
              <LineIcon color={colors.text} size={24} strokeWidth={1.5}>
                <Polyline points="8,5 1,12 8,19" />
              </LineIcon>
            </Pressable>
          )}
          {action === undefined ? null : <View style={styles.action}>{action}</View>}
        </View>
      ) : null}
      {title === undefined ? null : (
        <Text accessibilityLabel={title} accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      )}
      {subtitle === undefined ? null : <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  action: { flexShrink: 0, marginLeft: "auto" },
  back: { height: 44, justifyContent: "center", width: 44 },
  block: { gap: spacing.xs, paddingBottom: spacing.sm },
  // `Screen` pads by spacing.lg on every side; the header keeps that inset.
  fullBleed: {
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.smd,
  },
  pressed: { opacity: 0.6 },
  row: { alignItems: "center", flexDirection: "row", minHeight: 44 },
  subtitle: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14 },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.heading,
    fontSize: typography.title,
    fontWeight: "500",
  },
});
