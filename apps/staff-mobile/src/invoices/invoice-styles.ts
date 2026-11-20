import { spacing } from "@pilates/mobile-core";
import { StyleSheet } from "react-native";

/**
 * The invoice screen's layout. Its words take their `Text` variant there
 * (follow-up 285): «MONTO» `etiqueta`, the state `pastilla`, the amount
 * `cifra-grande`, all white on the 600 hero.
 */
export const invoiceStyles = StyleSheet.create({
  // E-D19: «MONTO» and the payment's state share the hero's first line.
  heroLabel: { flex: 1 },
  heroTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  note: { textAlign: "center" },
  row: { flexDirection: "row", justifyContent: "space-around" },
  screen: { paddingHorizontal: spacing.xlSm },
  toast: { bottom: spacing.xl * 4, left: 0, position: "absolute", right: 0 },
});
