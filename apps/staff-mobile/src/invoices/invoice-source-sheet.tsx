import { colors, fontFamilies, Glyph, spacing, surfaces } from "@pilates/mobile-core";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export type InvoiceSource = "camera" | "library";

const choices: readonly { source: InvoiceSource; label: string; icon: "image" | "upload" }[] = [
  { source: "camera", label: "Tomar foto", icon: "image" },
  { source: "library", label: "Elegir de la galería", icon: "upload" },
];

// E5 «Elegir archivo»: where the photo of the invoice comes from.
export function InvoiceSourceSheet({
  onChoose,
  onDismiss,
  visible,
}: {
  onChoose: (source: InvoiceSource) => void;
  onDismiss: () => void;
  visible: boolean;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onDismiss} transparent visible={visible}>
      <Pressable
        accessibilityLabel="Cerrar"
        accessibilityRole="button"
        onPress={onDismiss}
        style={styles.backdrop}
      />
      <View style={styles.sheet}>
        <View style={styles.group}>
          {choices.map((choice, index) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={choice.label}
              key={choice.source}
              onPress={() => onChoose(choice.source)}
              style={({ pressed }) => [
                styles.choice,
                index > 0 && styles.divided,
                pressed && styles.pressed,
              ]}
            >
              <Glyph color={colors.primaryOnTint} name={choice.icon} size={20} strokeWidth={1.6} />
              <Text style={styles.label}>{choice.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.group}>
          <Pressable
            accessibilityRole="button"
            onPress={onDismiss}
            style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
          >
            <Text style={[styles.label, styles.cancel]}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(74,58,48,0.32)" },
  cancel: { fontFamily: fontFamilies.bodyStrong },
  choice: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    height: 56,
    justifyContent: "center",
  },
  divided: { borderTopColor: colors.hairline, borderTopWidth: 1 },
  group: { ...surfaces.card, overflow: "hidden" },
  label: { color: colors.primaryOnTint, fontFamily: fontFamilies.body, fontSize: 18 },
  pressed: { backgroundColor: colors.primaryTint },
  sheet: {
    bottom: spacing.xl,
    gap: spacing.sm,
    left: spacing.sm,
    position: "absolute",
    right: spacing.sm,
  },
});
