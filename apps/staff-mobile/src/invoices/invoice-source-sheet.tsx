import { colors, Glyph, spacing, surfaces, Text } from "@pilates/mobile-core";
import { Modal, Pressable, StyleSheet, View } from "react-native";

export type InvoiceSource = "camera" | "library" | "document";

const choices: readonly {
  source: InvoiceSource;
  label: string;
  icon: "image" | "upload" | "document";
}[] = [
  { source: "camera", label: "Tomar foto", icon: "image" },
  { source: "library", label: "Elegir de la galería", icon: "upload" },
  // FIX-049: the issued PDF from the phone's files.
  { source: "document", label: "Elegir un PDF", icon: "document" },
];

// E5 «Elegir archivo» (E-D20): where the invoice comes from, a photo or a PDF.
// Each choice is a `titulo-fila` row; «Cancelar» is a button, `boton`.
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
              <Text variant="titulo-fila">{choice.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.group}>
          <Pressable
            accessibilityRole="button"
            onPress={onDismiss}
            style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
          >
            <Text variant="boton">Cancelar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  choice: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    height: 56,
    justifyContent: "center",
  },
  divided: { borderTopColor: colors.hairline, borderTopWidth: 1 },
  group: { ...surfaces.card, overflow: "hidden" },
  pressed: { backgroundColor: colors.primaryTint },
  sheet: {
    bottom: spacing.xl,
    gap: spacing.sm,
    left: spacing.sm,
    position: "absolute",
    right: spacing.sm,
  },
});
