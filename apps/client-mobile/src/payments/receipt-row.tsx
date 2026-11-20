import {
  Chevron,
  colors,
  fontFamilies,
  Glyph,
  radii,
  spacing,
  typography,
} from "@pilates/mobile-core";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { AttachedReceipt } from "./receipt-upload";

/** C10's «Elegir comprobante» row, and C10b's attached receipt with its ×. */
export function ReceiptRow({
  onAttach,
  onRemove,
  receipt,
  testID = "payment-receipt",
  uploading,
}: {
  onAttach: () => void;
  onRemove: () => void;
  receipt: AttachedReceipt | null;
  testID?: string;
  uploading: boolean;
}) {
  if (receipt === null) {
    return (
      <Pressable
        accessibilityLabel="Sube tu comprobante de transferencia"
        accessibilityRole="button"
        accessibilityState={{ disabled: uploading }}
        disabled={uploading}
        onPress={onAttach}
        style={styles.row}
        testID={testID}
      >
        <View style={styles.icon}>
          <Glyph color={colors.text} name="upload" size={18} strokeWidth={1.7} />
        </View>
        <View style={styles.body}>
          <Text style={styles.label}>
            {uploading ? "Subiendo comprobante…" : "Elegir comprobante"}
          </Text>
          <Text style={styles.note}>JPG o PNG · hasta 5 MB</Text>
        </View>
        <Chevron size={18} strokeWidth={1.7} tone="muted" />
      </Pressable>
    );
  }
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel="Comprobante adjunto. Toca para cambiarlo."
        accessibilityRole="button"
        onPress={onAttach}
        style={styles.attached}
        testID={testID}
      >
        <Image
          accessibilityLabel="Comprobante adjunto"
          source={{ uri: receipt.localUri }}
          style={styles.thumbnail}
        />
        <View style={styles.body}>
          <Text style={styles.label}>Comprobante listo</Text>
          <Text style={styles.note}>Listo para enviar · toca para cambiarlo</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel="Quitar comprobante"
        accessibilityRole="button"
        onPress={onRemove}
        style={styles.remove}
      >
        <Glyph color={colors.text} name="cross" size={16} strokeWidth={1.6} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  attached: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.md },
  body: { flex: 1, gap: spacing.xxs },
  // Rosa Emma C10: the glyph on a 36 pt 50 disc.
  icon: {
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  label: {
    color: colors.text,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.bodyMedium,
    fontWeight: "600",
  },
  note: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.note },
  remove: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  thumbnail: { borderRadius: radii.control, height: 44, width: 36 },
});
