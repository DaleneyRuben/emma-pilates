import { Chevron, chipStyles, PersonAvatar, radii, spacing, Text } from "@pilates/mobile-core";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

/**
 * A person in a Lino list group: initials on Palo de rosa (or the `face` given, such as a
 * Client's `ClientFace`, finding n.º 30), the name over one quiet line, an
 * optional trailing value (an amount in `cifra`, a pill) and a chevron when it
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
  // The open row is 600: its words turn white.
  const tone = selected ? "onDark" : "ink";
  const content = (
    <>
      {face ?? <PersonAvatar name={name} photoUri={null} size={36} />}
      <View style={styles.body}>
        <Text tone={tone} variant="titulo-fila">
          {name}
        </Text>
        {detail === undefined ? null : (
          <Text ellipsizeMode="tail" numberOfLines={1} tone={tone} variant="secundario">
            {detail}
          </Text>
        )}
      </View>
      {trailing}
      {amount === undefined ? null : (
        <Text tone={tone} variant="cifra">
          {amount}
        </Text>
      )}
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
  body: { flex: 1 },
  pressed: { opacity: 0.7 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  selected: { borderRadius: radii.card },
});
