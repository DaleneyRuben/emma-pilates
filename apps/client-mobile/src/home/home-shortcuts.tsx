import {
  colors,
  fontFamilies,
  Glyph,
  type GlyphName,
  radii,
  SectionTitle,
  spacing,
  surfaces,
  typography,
} from "@pilates/mobile-core";
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

// 02's «Accesos rápidos» on v2 (follow-up 225 §10): Lino tiles with a 36 pt
// Rosa tinte disc each; without a Plan, the booking row is locked at 60 %.
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

function Disc({ icon }: { icon: GlyphName }) {
  return (
    <View style={styles.disc} testID="shortcut-disc">
      <Glyph name={icon} size={18} strokeWidth={1.5} />
    </View>
  );
}

/** The locked «Reservar una clase» row without a Plan: a note and the lock. */
export function LockedShortcutRow({ label, note }: { label: string; note: string }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      disabled
      style={[styles.row, styles.locked]}
    >
      <Disc icon="calendar" />
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
 * A tile: the disc and the label, and a note only when the board draws one
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
      <Disc icon={icon} />
      <Text style={wide ? styles.rowTitle : styles.tileTitle}>{label}</Text>
      {wide ? <Text style={styles.note}>{note}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
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
