import { colors, radii, spacing, surfaces, Text } from "@pilates/mobile-core";
import { Pressable, StyleSheet, View } from "react-native";

import { promotionCardMaxWidth } from "./promotion-image";

type Action = { busy?: boolean; label: string; onPress: () => void; testID: string };

/**
 * Inicio's notice on top (Rosa Emma C02c, C02d, C02g): the screen's 600 hero
 * with an `etiqueta` eyebrow, a `titulo-bloque` title, white `cuerpo` lines,
 * and at most one white button or an underlined white link.
 */
export function HomeNotice({
  action,
  corner,
  eyebrow,
  lines,
  link,
  onPress,
  testID,
  title,
}: {
  action?: Action;
  /** A short fact at the top right, such as the amount. */
  corner?: string;
  eyebrow: string;
  lines: readonly string[];
  link?: Action;
  /** The whole block opens this, like its link. */
  onPress?: () => void;
  testID: string;
  title: string;
}) {
  const content = (
    <>
      <View style={styles.top}>
        <Text style={styles.eyebrow} tone="onDark" variant="etiqueta">
          {eyebrow}
        </Text>
        {corner === undefined ? null : (
          <Text tone="onDark" variant="titulo-fila">
            {corner}
          </Text>
        )}
      </View>
      <Text tone="onDark" variant="titulo-bloque">
        {title}
      </Text>
      {lines.map((line) => (
        <Text key={line} tone="onDark" variant="cuerpo">
          {line}
        </Text>
      ))}
      {action === undefined ? null : (
        <Pressable
          accessibilityLabel={action.busy ? "Preparando…" : action.label}
          accessibilityRole="button"
          accessibilityState={{ busy: action.busy === true }}
          onPress={() => {
            if (action.busy !== true) action.onPress();
          }}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          testID={action.testID}
        >
          <Text variant="boton">{action.busy ? "Preparando…" : action.label}</Text>
        </Pressable>
      )}
      {link === undefined ? null : (
        <Pressable
          accessibilityLabel={link.label}
          accessibilityRole="button"
          hitSlop={spacing.sm}
          onPress={link.onPress}
          style={styles.link}
          testID={link.testID}
        >
          <Text tone="onDark" variant="enlace">
            {link.label}
          </Text>
        </Pressable>
      )}
    </>
  );
  if (onPress === undefined) {
    return (
      <View style={[styles.block, styles.capped]} testID={testID}>
        {content}
      </View>
    );
  }
  return (
    // Screen readers reach the block's own button or link, so its text is
    // not read twice.
    <Pressable
      accessible={false}
      onPress={onPress}
      style={[styles.block, styles.capped]}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { ...surfaces.emphasis, gap: spacing.smd, padding: spacing.xlSm },
  button: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radii.button,
    justifyContent: "center",
    marginTop: spacing.smd,
    minHeight: 48,
    paddingHorizontal: spacing.lgXl,
  },
  // On a tablet it lines up with Inicio's button and plan row, from the left.
  capped: { alignSelf: "flex-start", maxWidth: promotionCardMaxWidth, width: "100%" },
  eyebrow: { flexShrink: 1 },
  link: { alignSelf: "flex-start", marginTop: spacing.smd, minHeight: 24 },
  pressed: { opacity: 0.85 },
  top: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
});
