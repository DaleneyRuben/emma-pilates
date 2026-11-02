import {
  colors,
  fontFamilies,
  Glyph,
  type GlyphName,
  PrimaryButton,
  radii,
  spacing,
  typography,
} from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * A Lino card with an icon disc, a title and one line (v2 S06 «Sin plan
 * activo» and «Cuenta pendiente de activación»), with an optional action.
 */
export function StateCard({
  action,
  children,
  icon,
  note,
  testID,
  title,
  trailing,
}: {
  action?: { label: string; onPress: () => void; testID?: string };
  children?: ReactNode;
  icon: GlyphName;
  note?: string;
  testID?: string;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.row}>
        <View style={styles.disc}>
          <Glyph color={colors.primary} name={icon} size={18} strokeWidth={1.5} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          {note === undefined ? null : <Text style={styles.note}>{note}</Text>}
        </View>
        {trailing}
      </View>
      {children}
      {action === undefined ? null : <PrimaryButton {...action} />}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  note: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 16,
    fontWeight: "500",
  },
});
