import {
  colors,
  fontFamilies,
  Glyph,
  type GlyphName,
  PrimaryButton,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * A white card with a line icon, a title and one line (E-C10 «Sin plan
 * activo», E-C12 «Cuenta pendiente de activación»), with an optional action.
 * `display` sets the title in Lora 22, as «Sin plan activo» reads.
 */
export function StateCard({
  action,
  children,
  display = false,
  icon,
  note,
  testID,
  title,
  trailing,
}: {
  action?: { label: string; onPress: () => void; testID?: string };
  children?: ReactNode;
  display?: boolean;
  icon: GlyphName;
  note?: string;
  testID?: string;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <View style={[styles.card, display && styles.displayCard]} testID={testID}>
      <View style={styles.row}>
        <View style={[styles.disc, display && styles.displayDisc]}>
          <Glyph color={colors.text} name={icon} size={22} strokeWidth={1.6} />
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, display && styles.displayTitle]}>{title}</Text>
          {note === undefined ? null : (
            <Text style={[styles.note, display && styles.displayNote]}>{note}</Text>
          )}
        </View>
        {trailing}
      </View>
      {children}
      {action === undefined ? null : <PrimaryButton {...action} />}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xs },
  card: { ...surfaces.card, gap: spacing.md, padding: spacing.lg },
  // FIX-089: the icon stands alone, with no tinted disc behind it.
  disc: { alignItems: "center", paddingTop: 1, width: 24 },
  displayCard: { gap: spacing.mdLg, padding: spacing.lgXl },
  displayDisc: { paddingTop: spacing.xs },
  displayNote: { fontFamily: fontFamilies.body, fontSize: typography.body, lineHeight: 22 },
  displayTitle: {
    fontFamily: fontFamilies.display,
    fontSize: typography.titleSecondary,
    fontWeight: "400",
    lineHeight: 28,
  },
  note: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20 },
  row: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 16,
    fontWeight: "700",
  },
});
