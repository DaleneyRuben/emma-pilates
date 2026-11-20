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
  /** A short fact such as «15 % de descuento», bold Crema text (no pill, FIX-089). */
  pill?: string;
  testID?: string;
  /** A Lora 24 white title. */
  title?: string;
};

/** The screen's one solid 600 hero (Rosa Emma): radius 24, padding 20, white text. */
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
        <View>
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
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.body,
    fontWeight: "700",
  },
  card: { ...surfaces.emphasis, gap: spacing.sm, padding: spacing.xlSm },
  eyebrow: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyBold,
    fontSize: typography.label,
    fontWeight: "700",
    letterSpacing: typography.label * 0.14,
    textTransform: "uppercase",
  },
  note: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.body,
    fontSize: 14,
    lineHeight: 21,
  },
  pillLabel: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.note,
    fontWeight: "700",
  },
  pressed: { opacity: 0.85 },
  title: {
    color: colors.onEmphasis,
    fontFamily: fontFamilies.display,
    fontSize: typography.hero,
    lineHeight: 31,
  },
});
