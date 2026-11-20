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

// 02's «Accesos rápidos» (Rosa Emma C02s, C02b): a Lora 24 section title,
// white tiles with the icon on a 40 pt 50 disc and a bold 15 label; without a
// Plan, the booking row is a locked soft inset with the icon on a white disc.
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

function TileIcon({ icon, onWhite }: { icon: GlyphName; onWhite?: boolean }) {
  return (
    <View style={onWhite ? styles.disc : styles.discOnSoft} testID="shortcut-disc">
      <Glyph color={colors.text} name={icon} size={onWhite ? 20 : 18} strokeWidth={1.7} />
    </View>
  );
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
      style={styles.row}
    >
      <TileIcon icon="calendar" />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.note}>{note}</Text>
      </View>
      <Glyph color={colors.text} name="lock" size={20} strokeWidth={1.7} testID="shortcut-lock" />
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
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <TileIcon icon={icon} onWhite />
      <Text style={styles.tileTitle}>{label}</Text>
      {wide ? <Text style={styles.note}>{note}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  discOnSoft: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  note: {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    lineHeight: 18,
  },
  pressed: { opacity: 0.7 },
  row: {
    ...surfaces.soft,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  rowBody: { flex: 1, gap: spacing.xxs },
  rowTitle: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.bodyMedium,
    fontWeight: "600",
  },
  stack: { gap: spacing.md },
  tile: { ...surfaces.card, flex: 1, gap: spacing.sm, padding: spacing.mdLg },
  tileTitle: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.body,
    fontWeight: "700",
    lineHeight: 21,
  },
  tiles: { flexDirection: "row", gap: spacing.md },
});
