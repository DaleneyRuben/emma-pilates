import { colors, Glyph, radii, spacing, surfaces, Text } from "@pilates/mobile-core";
import { Image, Pressable, StyleSheet, View } from "react-native";

import type { PickedImage } from "../uploads/image-upload";

// A page object reads `/Type /Page`; the tree above them reads `/Type /Pages`.
const pagePattern = /\/Type\s*\/Page(?![a-z])/g;

/**
 * How many pages a picked PDF has, read from its bytes on the phone before it
 * is sent (E-D27). A compressed object stream can hide them: at least one.
 */
export function pdfPageCount(bytes: Uint8Array): number {
  let text = "";
  for (let at = 0; at < bytes.length; at += 1) text += String.fromCharCode(bytes[at]!);
  return Math.max(1, text.match(pagePattern)?.length ?? 0);
}

const kilobytes = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;
const pages = (count: number) => (count === 1 ? "1 página" : `${count} páginas`);

/**
 * E-D27 / E-D28 (walkthrough n.º 24): the file she chose, before it is sent,
 * like the Client's receipt (C10b): a PDF by its name with its pages and size,
 * a photo by its thumbnail, which opens it big; «Cambiar» and the × beside.
 */
export function PickedInvoiceCard({
  onChange,
  onOpen,
  onRemove,
  picked,
}: {
  onChange: () => void;
  onOpen: () => void;
  onRemove: () => void;
  picked: PickedImage;
}) {
  const pdf = picked.mediaType === "application/pdf";
  return (
    <View style={styles.card} testID="invoice-picked">
      {pdf ? (
        <View style={styles.file}>
          <View style={styles.icon}>
            <Glyph color={colors.text} name="document" size={22} strokeWidth={1.6} />
          </View>
          <View style={styles.text}>
            <Text numberOfLines={1} variant="titulo-fila">
              {picked.fileName ?? "factura.pdf"}
            </Text>
            <Text variant="secundario">
              {`PDF · ${pages(pdfPageCount(picked.bytes))} · ${kilobytes(picked.bytes.byteLength)}`}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.file}>
          <Pressable
            accessibilityLabel="Ver factura en grande"
            accessibilityRole="button"
            onPress={onOpen}
          >
            <Image source={{ uri: picked.uri }} style={styles.thumbnail} />
          </Pressable>
          <View style={styles.text}>
            <Text variant="titulo-fila">Factura lista</Text>
            <Text variant="secundario">Foto · toca la miniatura para verla</Text>
          </View>
        </View>
      )}
      <Pressable
        accessibilityLabel="Cambiar"
        accessibilityRole="button"
        onPress={onChange}
        style={({ pressed }) => [styles.change, pressed && styles.pressed]}
      >
        <Text variant="boton-chico">Cambiar</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Quitar archivo"
        accessibilityRole="button"
        hitSlop={spacing.xs}
        onPress={onRemove}
        style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
      >
        <Glyph color={colors.text} name="cross" size={16} strokeWidth={1.6} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  change: {
    alignItems: "center",
    borderColor: colors.text,
    borderRadius: radii.control,
    borderWidth: 1.5,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  file: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.md },
  icon: {
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 8,
    height: 50,
    justifyContent: "center",
    width: 40,
  },
  pressed: { opacity: 0.7 },
  remove: {
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.hairline,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  text: { flex: 1, gap: 2 },
  thumbnail: { borderRadius: radii.control, height: 50, width: 40 },
});
