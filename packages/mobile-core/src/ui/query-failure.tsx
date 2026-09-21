import { StyleSheet, View } from "react-native";

import { BodyText } from "./body-text";
import { PrimaryButton } from "./primary-button";
import { spacing } from "./tokens";

type QueryFailureProps = {
  label: string;
  onRetry: () => void;
};

export function QueryFailure({ label, onRetry }: QueryFailureProps) {
  return (
    <View style={styles.centered}>
      <BodyText accessibilityRole="alert">{label}</BodyText>
      <PrimaryButton label="Reintentar" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    flex: 1,
    gap: spacing.lg,
    justifyContent: "center",
  },
});
