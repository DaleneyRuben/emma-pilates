import {
  Chevron,
  chipStyles,
  colors,
  fontFamilies,
  initials,
  radii,
  spacing,
} from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

/** A person's initials in a 36 pt Rosa tinte disc (v2 S04, S11, CON, S24). */
export function InitialsDisc({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <View style={[styles.disc, { borderRadius: size / 2, height: size, width: size }]}>
      <Text style={[styles.initials, { fontSize: size * 0.42 }]}>{initials(name)}</Text>
    </View>
  );
}

/**
 * A person in a Lino list group: initials (or the `face` given, such as a
 * Client's `ClientFace`, finding n.º 30), the name over one quiet line, an
 * optional trailing value (an amount in Lora 18, a pill) and a chevron when it
 * opens something. Put rows in `IconRowGroup` for the hairline inset 64.
 */
export function PersonRow({
  accessibilityLabel,
  amount,
  detail,
  face,
  name,
  onPress,
  selected = false,
  testID,
  trailing,
}: {
  accessibilityLabel?: string;
  amount?: string;
  detail?: string;
  face?: ReactNode;
  name: string;
  onPress?: () => void;
  selected?: boolean;
  testID?: string;
  trailing?: ReactNode;
}) {
  const content = (
    <>
      {face ?? <InitialsDisc name={name} />}
      <View style={styles.body}>
        <Text style={[styles.name, selected && chipStyles.labelSelected]}>{name}</Text>
        {detail === undefined ? null : (
          <Text
            ellipsizeMode="tail"
            numberOfLines={1}
            style={[styles.detail, selected && styles.onSelected]}
          >
            {detail}
          </Text>
        )}
      </View>
      {trailing}
      {amount === undefined ? null : <Text style={styles.amount}>{amount}</Text>}
      {/* The open row needs no way in: its panel already shows it. */}
      {onPress === undefined || selected ? null : (
        <Chevron size={16} strokeWidth={1.5} tone="muted" />
      )}
    </>
  );
  if (onPress === undefined) {
    return (
      <View style={styles.row} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? name}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected && [chipStyles.boxSelected, styles.selected],
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.text,
    fontFamily: fontFamilies.display,
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
  body: { flex: 1 },
  detail: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: 13 },
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    flexShrink: 0,
    justifyContent: "center",
  },
  initials: { color: colors.primaryOnTint, fontFamily: fontFamilies.display },
  name: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 16 },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  onSelected: { color: colors.onPrimary },
  selected: { borderRadius: radii.card },
});
