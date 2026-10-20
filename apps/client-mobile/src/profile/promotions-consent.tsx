import { BodyText, colors, LineIcon, spacing, typography } from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Polyline } from "react-native-svg";

const label = "Quiero seguir recibiendo promociones de Emma Pilates";

// Follow-up 100 (ADR-0097): the Client may keep their contact for promotions
// when closing; the whole row toggles the box and it always starts unticked.
export function PromotionsConsent({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.row}
      testID="close-account-promotions"
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? (
          <LineIcon color={colors.white} size={14} strokeWidth={2.4}>
            <Polyline points="5,12.5 10,17 19,7.5" />
          </LineIcon>
        ) : null}
      </View>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        <BodyText style={styles.helper}>
          Guardamos solo tu nombre, correo y teléfono para enviarte promociones. Puedes pedir que
          paremos cuando quieras.
        </BodyText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.borderStrong,
    borderRadius: 6,
    borderWidth: 1.5,
    height: 22,
    justifyContent: "center",
    marginTop: 1,
    width: 22,
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  helper: { color: colors.textMuted, fontSize: typography.note },
  label: { color: colors.text, fontSize: typography.body, lineHeight: 21 },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  text: { flex: 1, gap: spacing.xs },
});
