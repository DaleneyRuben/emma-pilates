import {
  acquisitionChannelOptions,
  type AcquisitionChannelChoice,
  colors,
  fontFamilies,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";

/**
 * S05's «¿Cómo nos conoció?» as a two-column grid of Lino tiles (walkthrough
 * 20), the chosen one Rosa tinte. Same answers as the shared chip field.
 */
export function ChannelGrid({
  error,
  label,
  onChange,
  value,
}: {
  error?: string;
  label: string;
  onChange: (value: AcquisitionChannelChoice) => void;
  value: AcquisitionChannelChoice | null;
}) {
  return (
    <View style={styles.field}>
      <View accessibilityLabel={label} accessibilityRole="radiogroup" style={styles.grid}>
        {acquisitionChannelOptions.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              accessibilityLabel={option.label}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={option.value}
              onPress={() => {
                // The phone pad has no return key to close it over the submit.
                Keyboard.dismiss();
                onChange(option.value);
              }}
              style={[styles.tile, selected && styles.selected, error && !selected && styles.alert]}
              testID={`acquisition-channel-${option.value}`}
            >
              <Text style={[styles.tileLabel, selected && styles.selectedLabel]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error === undefined ? null : (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  alert: { borderColor: colors.error, borderWidth: 1 },
  error: { color: colors.errorText, fontFamily: fontFamilies.body, fontSize: typography.note },
  field: { gap: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  selected: { backgroundColor: colors.primaryTint },
  selectedLabel: { color: colors.primaryOnTint, fontFamily: fontFamilies.bodyStrong },
  tile: {
    backgroundColor: colors.card,
    borderRadius: 12,
    flexBasis: "48%",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tileLabel: { color: colors.text, fontFamily: fontFamilies.body, fontSize: 14 },
});
