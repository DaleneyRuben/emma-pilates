import { StyleSheet, View } from "react-native";

import { Glyph } from "./glyph";
import { PrimaryButton } from "./primary-button";
import { Text } from "./text";
import { colors, spacing, surfaces } from "./tokens";

type QueryFailureProps = {
  label: string;
  onRetry: () => void;
};

/**
 * A screen's load failure (Rosa Emma E-A13, C02i): a white card at the top of
 * the space under the header, the alert on a 50 disc, the sentence in
 * `cuerpo`, centred (never Lora: follow-up 285), and «Reintentar».
 */
export function QueryFailure({ label, onRetry }: QueryFailureProps) {
  return (
    <View style={styles.area}>
      <View style={styles.card} testID="query-failure">
        <View style={styles.disc}>
          <Glyph color={colors.text} name="alert" size={28} strokeWidth={1.6} />
        </View>
        <Text accessibilityRole="alert" style={styles.label} variant="cuerpo">
          {label}
        </Text>
        <View style={styles.action}>
          <PrimaryButton label="Reintentar" onPress={onRetry} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  action: { alignSelf: "stretch" },
  area: { flex: 1 },
  card: {
    ...surfaces.card,
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.xlSm,
    paddingVertical: spacing.xl + spacing.xs,
  },
  disc: {
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.borderSoft,
    borderRadius: 32,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  label: { textAlign: "center" },
});
