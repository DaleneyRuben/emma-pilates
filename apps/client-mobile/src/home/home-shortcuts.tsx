import {
  colors,
  fontFamilies,
  Glyph,
  type GlyphName,
  SectionTitle,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

// 02's «Accesos rápidos» on v2 (follow-up 225 §10): Lino tiles; without a
// Plan, the booking row is locked at 60 %. FIX-082 (design audit 2026-11-18):
// no tinted disc behind the icon, which takes the muted text colour.
export function ShortcutSection({ children }: PropsWithChildren) {
  return (
    <View>
      <SectionTitle>Accesos rápidos</SectionTitle>
      <View style={styles.stack}>{children}</View>
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

function TileIcon({ icon }: { icon: GlyphName }) {
  return <Glyph color={colors.textMuted} name={icon} size={18} strokeWidth={1.5} />;
}

/** The locked «Reservar una clase» row without a Plan: a note and the lock. */
export function LockedShortcutRow({ label, note }: { label: string; note: string }) {
  return (
    // The label hides the note from screen readers, so the hint carries it.
    <Pressable
      accessibilityHint={note}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      disabled
      style={[styles.row, styles.locked]}
    >
      <TileIcon icon="calendar" />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.note}>{note}</Text>
      </View>
      <Glyph
        color={colors.textMuted}
        name="lock"
        size={18}
        strokeWidth={1.5}
        testID="shortcut-lock"
      />
    </Pressable>
  );
}

/**
 * A tile: the icon and the label, and a note only when the board draws one
 * (without a Plan). `hint` carries the live summary for screen readers.
 */
export function ShortcutTile({
  hint,
  icon,
  label,
  note,
  onPress,
}: {
  hint?: string;
  icon: GlyphName;
  label: string;
  note?: string;
  onPress: () => void;
}) {
  const wide = note !== undefined;
  return (
    <Pressable
      accessibilityHint={hint}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, wide && styles.tileWide, pressed && styles.pressed]}
    >
      <TileIcon icon={icon} />
      <Text style={wide ? styles.rowTitle : styles.tileTitle}>{label}</Text>
      {wide ? <Text style={styles.note}>{note}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  locked: { opacity: 0.6 },
  note: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  pressed: { opacity: 0.7 },
  row: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  rowBody: { flex: 1, gap: spacing.xxs },
  rowTitle: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.bodyMedium,
    fontWeight: "500",
  },
  stack: { gap: spacing.md },
  tile: {
    ...surfaces.card,
    flex: 1,
    gap: spacing.smLg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.mdLg,
  },
  tileTitle: {
    color: colors.text,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
    fontWeight: "500",
  },
  tileWide: { gap: spacing.md, padding: spacing.lg },
  tiles: { flexDirection: "row", gap: spacing.md },
});
