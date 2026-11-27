import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Text } from "./text";
import type { TextTone, TextVariant } from "./type-scale";

/**
 * A button's label, or while its request is in flight a spinner in its place
 * (follow-up 93). The label stays, invisible, so the button keeps its size;
 * the wrapper hides it, never the text's own style (follow-up 285, rule 5).
 */
export function ButtonLabel({
  busy = false,
  label,
  spinnerColor,
  testID = "button-spinner",
  tone = "ink",
  variant = "boton",
}: {
  busy?: boolean;
  label: string;
  spinnerColor: string;
  testID?: string;
  /** `onDark` on a 600 fill, `ink` everywhere else. */
  tone?: TextTone;
  /** `boton` for every button, `boton-chico` for a small one. */
  variant?: Extract<TextVariant, "boton" | "boton-chico">;
}) {
  return (
    <>
      <View
        style={[styles.label, busy && styles.hidden]}
        testID={busy ? "button-label-hidden" : "button-label"}
      >
        {/* #24 (Android): the label was measured short («Subir factura»
            drew as «Subir»), so it spans the button and centres itself rather
            than trusting its own measured width; a new label gets a fresh view. */}
        <Text key={label} style={styles.text} tone={tone} variant={variant}>
          {label}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator
          color={spinnerColor}
          size="small"
          style={styles.spinner}
          testID={testID}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  hidden: {
    opacity: 0,
  },
  label: { alignSelf: "stretch" },
  text: { textAlign: "center" },
  spinner: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
