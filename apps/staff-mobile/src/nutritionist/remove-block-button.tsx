import { ButtonLabel, colors, radii, typography } from "@pilates/mobile-core";
import { Pressable, StyleSheet } from "react-native";

/** S17's «Quitar horario»: the Error-outline action in the change sheet. */
export function RemoveBlockButton({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Quitar horario"
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={styles.button}
    >
      <ButtonLabel
        busy={busy}
        label="Quitar horario"
        spinnerColor={colors.errorText}
        style={styles.label}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderColor: colors.error,
    borderRadius: radii.control,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  label: { color: colors.errorText, fontSize: typography.body },
});
