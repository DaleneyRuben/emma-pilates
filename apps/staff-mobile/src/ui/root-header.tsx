import { colors, fontFamilies, Heading, spacing, typography } from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { NotificationBell } from "./notification-bell";

/**
 * A tab root's title block (v2): an uppercase eyebrow such as «Entrenadora ·
 * Lunes 2 de noviembre», the Lora 30 title, an optional one-line note, and on
 * the roots that carry it the notification bell. Perfil is a tab, so no root
 * draws the avatar any more (follow-up 225 §8).
 */
export function RootHeader({
  action,
  bell = false,
  eyebrow,
  label,
  note,
  title,
}: {
  action?: ReactNode;
  bell?: boolean;
  eyebrow?: string;
  label?: string;
  note?: string;
  title: string;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <View style={styles.titles}>
          {eyebrow === undefined ? null : <Text style={styles.eyebrow}>{eyebrow}</Text>}
          <Heading accessibilityLabel={label ?? title} accessibilityRole="header">
            {title}
          </Heading>
        </View>
        {action}
        {bell ? <NotificationBell /> : null}
      </View>
      {note === undefined ? null : <Text style={styles.note}>{note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontWeight: "500",
    letterSpacing: typography.label * 0.12,
    textTransform: "uppercase",
  },
  header: { gap: spacing.sm },
  note: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.body,
    lineHeight: 22,
  },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  titles: { flex: 1, gap: spacing.xs },
});
