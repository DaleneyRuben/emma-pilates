import { colors, Glyph, spacing, surfaces, Text } from "@pilates/mobile-core";
import { useEffect, useEffectEvent, useRef } from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";

export type InvoiceSource = "library" | "document";

const choices: readonly {
  source: InvoiceSource;
  label: string;
  icon: "image" | "document";
}[] = [
  // Owner, 26 Nov (walkthrough n.º 25): no «Tomar foto»; the invoice is a file.
  { source: "library", label: "Elegir una imagen", icon: "image" },
  // FIX-049: the issued PDF from the phone's files.
  { source: "document", label: "Elegir un PDF", icon: "document" },
];

// iOS reports the close; this only guards a close it never reports.
const closeFallbackMilliseconds = 1000;

// E5 «Elegir archivo» (E-D20): where the invoice comes from, a photo or a PDF.
// Each choice is a `titulo-fila` row; «Cancelar» is a button, `boton`.
// iOS cannot present the picker while this sheet is still closing (walkthrough
// n.º 25), so there the choice is handed over once the Modal has dismissed.
export function InvoiceSourceSheet({
  onChoose,
  onDismiss,
  visible,
}: {
  onChoose: (source: InvoiceSource) => void;
  onDismiss: () => void;
  visible: boolean;
}) {
  const chosen = useRef<InvoiceSource | null>(null);
  const fallback = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handOver = () => {
    if (fallback.current !== null) clearTimeout(fallback.current);
    fallback.current = null;
    const source = chosen.current;
    chosen.current = null;
    if (source !== null) onChoose(source);
  };

  // The fallback counts from the moment the sheet starts closing (review).
  const handOverLate = useEffectEvent(handOver);
  useEffect(() => {
    if (visible || Platform.OS !== "ios" || chosen.current === null) return undefined;
    fallback.current = setTimeout(() => handOverLate(), closeFallbackMilliseconds);
    return () => {
      if (fallback.current !== null) clearTimeout(fallback.current);
    };
  }, [visible]);

  const choose = (source: InvoiceSource) => {
    chosen.current = source;
    onDismiss();
    if (Platform.OS !== "ios") handOver();
  };

  return (
    <Modal
      animationType="slide"
      onDismiss={handOver}
      onRequestClose={onDismiss}
      testID="invoice-source-sheet"
      transparent
      visible={visible}
    >
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
              onPress={() => choose(choice.source)}
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
