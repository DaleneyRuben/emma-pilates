import {
  Chevron,
  colors,
  fontFamilies,
  Glyph,
  type GlyphName,
  radii,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

// 02's «Accesos rápidos» (MOB-042): a full-width «Reservar una clase» row
// with an icon tile over two half-width tiles, as the frame draws them.
export function ShortcutSection({ children }: PropsWithChildren) {
  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>Accesos rápidos</Text>
      {children}
    </View>
  );
}

export function ShortcutTiles({ children }: PropsWithChildren) {
  return (
    <View style={styles.tiles} testID="shortcut-tiles">
      {children}
    </View>
  );
}

/** The full-width row: it ends in the chevron, or in the quiet lock with its note while disabled. */
export function ShortcutRow({
  disabled = false,
  disabledNote,
  label,
  note,
  onPress,
}: {
  disabled?: boolean;
  disabledNote: string;
  label: string;
  note: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.row, disabled && styles.rowDisabled]}
    >
      <View style={[styles.iconTile, disabled && styles.iconTileDisabled]} testID="shortcut-tile">
        <Glyph color={disabled ? colors.disabledText : colors.primary} name="calendar" size={22} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, disabled && styles.rowTitleDisabled]}>{label}</Text>
        <Text style={styles.rowNote}>{disabled ? disabledNote : note}</Text>
      </View>
      {disabled ? (
        <Glyph color={colors.iconQuiet} name="lock" size={19} testID="shortcut-lock" />
      ) : (
        <Chevron />
      )}
    </Pressable>
  );
}

/** A half-width tile: a 22 pt icon, a Lora 16 title, and a 12 pt note; no chevron. */
export function ShortcutTile({
  icon,
  label,
  onPress,
  summary,
}: {
  icon: GlyphName;
  label: string;
  onPress: () => void;
  summary: string;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label}: ${summary}`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.tile}
    >
      <Glyph name={icon} size={22} />
      <Text style={styles.tileTitle}>{label}</Text>
      <Text style={styles.tileNote}>{summary}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.textMuted,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 1.76,
    textTransform: "uppercase",
  },
  iconTile: {
    alignItems: "center",
    backgroundColor: colors.accentTint,
    borderRadius: radii.inset,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  iconTileDisabled: { backgroundColor: colors.inkTint },
  row: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.mdLg,
    padding: spacing.lgXl,
  },
  rowBody: { flex: 1, gap: spacing.xxs },
  rowDisabled: {
    backgroundColor: colors.background,
    borderColor: colors.disabledBackground,
    elevation: 0,
    shadowOpacity: 0,
  },
  rowNote: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  rowTitle: {
    color: colors.text,
    fontFamily: fontFamilies.heading,
    fontSize: typography.bodyLarge,
  },
  rowTitleDisabled: { color: colors.disabledText },
  section: { gap: spacing.md },
  tile: { ...surfaces.card, flex: 1, gap: spacing.smLg, padding: spacing.lgXl },
  tileNote: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.label },
  tileTitle: {
    color: colors.text,
    fontFamily: fontFamilies.heading,
    fontSize: typography.bodyMedium,
    lineHeight: 21,
  },
  tiles: { flexDirection: "row", gap: spacing.md },
});
