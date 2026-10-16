import { ActivityIndicator, StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

/**
 * A button's label, or while its request is in flight a spinner in its place
 * (follow-up 93). The label stays, invisible, so the button keeps its size.
 */
export function ButtonLabel({
  busy = false,
  label,
  spinnerColor,
  style,
  testID = "button-spinner",
}: {
  busy?: boolean;
  label: string;
  spinnerColor: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}) {
  return (
    <>
      <Text style={[style, busy && styles.hidden]}>{label}</Text>
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
  spinner: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
});
