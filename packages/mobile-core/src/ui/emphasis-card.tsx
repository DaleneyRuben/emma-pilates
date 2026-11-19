import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fontFamilies } from "./fonts";
import { colors, radii, spacing, surfaces, typography } from "./tokens";

type Action = { label: string; onPress: () => void; testID?: string };

export type EmphasisCardProps = {
  /** At most one «On emphasis» white pill button. */
  action?: Action;
  /** Custom content between the note and the action: a big number, a progress bar. */
  children?: ReactNode;
  /** The uppercase label on top, in white at 75 %. */
  eyebrow?: string;
  /** One line of white 85 % text. */
  note?: string;
  /** A pill such as «15 % de descuento»: white text on white 18 %. */
  pill?: string;
  testID?: string;
  /** A Lora 24 white title. */
  title?: string;
};

/** The screen's one Rosa profundo card (follow-up 225 §5): radius 20, padding 20. */
export function EmphasisCard({
  action,
  children,
  eyebrow,
  note,
  pill,
  testID,
  title,
}: EmphasisCardProps) {
  return (
    <View style={styles.card} testID={testID}>
      {eyebrow === undefined ? null : <Text style={styles.eyebrow}>{eyebrow}</Text>}
      {pill === undefined ? null : (
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>{pill}</Text>
        </View>
      )}
      {title === undefined ? null : <Text style={styles.title}>{title}</Text>}
      {note === undefined ? null : <Text style={styles.note}>{note}</Text>}
      {children}
      {action === undefined ? null : <OnEmphasisButton {...action} />}
    </View>
  );
}

/** The Crema pill action on the hero block, 44 high (follow-up 225 §4). */
export function OnEmphasisButton({ label, onPress, testID }: Action) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      testID={testID}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.xlSm,
  },
  buttonLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
  },
  card: { ...surfaces.emphasis, gap: spacing.md, padding: spacing.xlSm },
  eyebrow: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: typography.label,
    fontWeight: "500",
    letterSpacing: typography.label * 0.12,
    textTransform: "uppercase",
  },
  note: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 21,
  },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.smLg,
    paddingVertical: spacing.xs,
  },
  pillLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.note,
    fontWeight: "600",
  },
  pressed: { opacity: 0.85 },
  title: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.display,
    fontSize: 24,
    lineHeight: 29,
  },
});
