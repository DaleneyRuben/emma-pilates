import {
  colors,
  fontFamilies,
  radii,
  SectionTitle,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type PaymentMethod = "cash" | "qr";

const options: { key: PaymentMethod; label: string; next: string }[] = [
  { key: "cash", label: "Efectivo", next: "Entra a la caja de hoy" },
  { key: "qr", label: "QR", next: "Subes el comprobante" },
];

/**
 * Staff pick E3 C: «Cómo paga» as two large options, each saying what happens
 * next. Crema with an Arcilla border; the chosen one Rosa profundo with Crema
 * text. The way closed by a pending payment is off (FIX-028).
 */
export function PaymentMethodOptions({
  lockedTo,
  onSelect,
  selected,
}: {
  lockedTo: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  selected: PaymentMethod;
}) {
  return (
    <View>
      <SectionTitle>Cómo paga</SectionTitle>
      <View accessibilityLabel="Cómo paga" accessibilityRole="radiogroup" style={styles.row}>
        {options.map((option) => {
          const disabled = lockedTo !== null && lockedTo !== option.key;
          // A closed way is never drawn as chosen, and says why it is off.
          const filled = option.key === selected && !disabled;
          const next = disabled ? "Hay un pago en revisión" : option.next;
          return (
            <Pressable
              accessibilityLabel={`${option.label}. ${next}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: option.key === selected, disabled }}
              disabled={disabled}
              key={option.key}
              onPress={() => onSelect(option.key)}
              style={[styles.option, filled && styles.chosen]}
              testID={`payment-method-${option.key}`}
            >
              <Text style={[styles.label, filled && styles.chosenText]}>{option.label}</Text>
              <Text style={[styles.next, filled && styles.chosenText]}>{next}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chosen: { backgroundColor: colors.primary, borderColor: colors.primary },
  chosenText: { color: colors.onPrimary },
  label: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.bodyLarge,
    fontWeight: "700",
  },
  next: { color: colors.textMuted, fontFamily: fontFamilies.body, fontSize: typography.note },
  option: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.button,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  row: { flexDirection: "row", gap: spacing.md },
});
