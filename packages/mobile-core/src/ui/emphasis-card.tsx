import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "./text";
import { colors, radii, spacing, surfaces } from "./tokens";

type Action = { label: string; onPress: () => void; testID?: string };

export type EmphasisCardProps = {
  /** At most one «On emphasis» white pill button. */
  action?: Action;
  /** Custom content between the note and the action: a big number, a progress bar. */
  children?: ReactNode;
  /** The uppercase `etiqueta` on top, in white. */
  eyebrow?: string;
  /** A row above everything, such as «Te invitó Lucía» with her initials (C02f). */
  lead?: ReactNode;
  /** One line of white `cuerpo`. */
  note?: string;
  /** A short fact such as «15 % de descuento», white `pastilla` (no pill, FIX-089). */
  pill?: string;
  testID?: string;
  /** A white `titulo-bloque` title. */
  title?: string;
};

/** The screen's one solid 600 hero (Rosa Emma): radius 24, padding 20, white text. */
export function EmphasisCard({
  action,
  children,
  eyebrow,
  lead,
  note,
  pill,
  testID,
  title,
}: EmphasisCardProps) {
  return (
    <View style={styles.card} testID={testID}>
      {lead}
      {eyebrow === undefined ? null : (
        <Text tone="onDark" variant="etiqueta">
          {eyebrow}
        </Text>
      )}
      {pill === undefined ? null : (
        <View>
          <Text tone="onDark" variant="pastilla">
            {pill}
          </Text>
        </View>
      )}
      {title === undefined ? null : (
        <Text tone="onDark" variant="titulo-bloque">
          {title}
        </Text>
      )}
      {note === undefined ? null : (
        <Text tone="onDark" variant="cuerpo">
          {note}
        </Text>
      )}
      {children}
      {action === undefined ? null : <OnEmphasisButton {...action} />}
    </View>
  );
}

/** The white pill action on the hero block, 44 high (follow-up 225 §4), in ink `boton`. */
export function OnEmphasisButton({
  label,
  onPress,
  testID,
  wide = false,
}: Action & {
  /** Fills the card's width, as E-F13's «Compartir tu código». */
  wide?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, wide && styles.wide, pressed && styles.pressed]}
      testID={testID}
    >
      <Text variant="boton">{label}</Text>
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
  card: { ...surfaces.emphasis, gap: spacing.sm, padding: spacing.xlSm },
  wide: { alignSelf: "stretch", minHeight: 48 },
  pressed: { opacity: 0.85 },
});
