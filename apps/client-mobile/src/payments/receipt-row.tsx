import { Chevron, colors, Glyph, radii, spacing, Text } from "@pilates/mobile-core";
import { Image, Pressable, StyleSheet, View } from "react-native";

/** Where the receipt stands: none yet, uploading with its progress, or attached. */
export type ReceiptState =
  | { status: "empty" }
  | { localUri?: string; progress?: number; status: "uploading" }
  | { localUri: string; status: "ready" };

/** The row's state from an attached receipt and an upload in flight. */
export const receiptStateOf = (
  receipt: { localUri: string } | null,
  uploading: boolean,
): ReceiptState =>
  uploading
    ? { status: "uploading" }
    : receipt === null
      ? { status: "empty" }
      : { localUri: receipt.localUri, status: "ready" };

/**
 * C10's «Elegir comprobante» row; C10u's upload with its progress
 * (walkthrough n.º 7); C10b's «Comprobante listo» with a visible «Cambiar»,
 * the ×, and a thumbnail that opens it big (n.º 23). Only those controls are
 * buttons: the row itself no longer is.
 */
export function ReceiptRow({
  onAttach,
  onOpen,
  onRemove,
  receipt,
  testID = "payment-receipt",
}: {
  onAttach: () => void;
  /** Opens the receipt big (C10v); without it the thumbnail is only a picture. */
  onOpen?: () => void;
  onRemove: () => void;
  receipt: ReceiptState;
  testID?: string;
}) {
  if (receipt.status === "empty") {
    return (
      <Pressable
        accessibilityLabel="Sube tu comprobante de transferencia"
        accessibilityRole="button"
        onPress={onAttach}
        style={styles.row}
        testID={testID}
      >
        <View style={styles.icon}>
          <Glyph color={colors.text} name="upload" size={18} strokeWidth={1.7} />
        </View>
        <View style={styles.body}>
          <Text variant="titulo-fila">Elegir comprobante</Text>
          <Text variant="secundario">JPG o PNG · hasta 5 MB</Text>
        </View>
        <Chevron size={18} strokeWidth={1.7} tone="muted" />
      </Pressable>
    );
  }
  if (receipt.status === "uploading") {
    const percent = receipt.progress === undefined ? undefined : Math.round(receipt.progress * 100);
    return (
      // A second tap does nothing while the receipt uploads.
      <View accessibilityState={{ busy: true, disabled: true }} style={styles.row} testID={testID}>
        {receipt.localUri === undefined ? (
          <View style={styles.icon}>
            <Glyph color={colors.text} name="upload" size={18} strokeWidth={1.7} />
          </View>
        ) : (
          <Image source={{ uri: receipt.localUri }} style={styles.uploadingThumbnail} />
        )}
        <View style={styles.uploadingBody}>
          <Text variant="titulo-fila">Subiendo comprobante</Text>
          {percent === undefined ? null : (
            <View
              accessible
              accessibilityLabel="Avance de la subida"
              accessibilityRole="progressbar"
              accessibilityValue={{ max: 100, min: 0, now: percent }}
              style={styles.track}
            >
              <View style={[styles.fill, { width: `${percent}%` }]} />
            </View>
          )}
        </View>
        {percent === undefined ? null : <Text variant="titulo-fila">{`${percent} %`}</Text>}
      </View>
    );
  }
  const thumbnail = (
    <Image
      accessibilityLabel="Comprobante adjunto"
      source={{ uri: receipt.localUri }}
      style={styles.thumbnail}
    />
  );
  return (
    <View style={[styles.row, styles.readyRow]} testID={testID}>
      {onOpen === undefined ? (
        thumbnail
      ) : (
        <Pressable
          accessibilityLabel="Ver comprobante en grande"
          accessibilityRole="button"
          onPress={onOpen}
        >
          {thumbnail}
        </Pressable>
      )}
      {/* Shrinks a little rather than cut on a narrow phone or a large text size. */}
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        numberOfLines={1}
        style={styles.body}
        variant="titulo-fila"
      >
        Comprobante listo
      </Text>
      <View style={styles.readyActions} testID="receipt-ready-actions">
        <Pressable
          accessibilityLabel="Cambiar"
          accessibilityRole="button"
          onPress={onAttach}
          style={({ pressed }) => [styles.change, pressed && styles.pressed]}
        >
          <Text variant="boton-chico">Cambiar</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Quitar comprobante"
          accessibilityRole="button"
          hitSlop={spacing.xs}
          onPress={onRemove}
          style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
        >
          <Glyph color={colors.text} name="cross" size={16} strokeWidth={1.6} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: spacing.xxs },
  // C10b: «Cambiar» outlined in 600, 36 pt high, radius 12, 14 pt bold.
  change: {
    alignItems: "center",
    borderColor: colors.text,
    borderRadius: spacing.md,
    borderWidth: 1.5,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.mdLg,
  },
  fill: { backgroundColor: colors.text, height: "100%" },
  // Rosa Emma C10: the glyph on a 36 pt 50 disc.
  icon: {
    alignItems: "center",
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  pressed: { opacity: 0.7 },
  readyActions: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  // C10b: 12 pt over and 14 pt beside, so the title fits whole at 390 pt.
  readyRow: { paddingHorizontal: spacing.mdLg, paddingVertical: spacing.md },
  // C10b: the × on a 36 pt 50 disc with its hairline.
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
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  thumbnail: { borderRadius: radii.control, height: 50, width: 40 },
  track: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.hairline,
    borderRadius: 3,
    borderWidth: 1,
    height: 6,
    overflow: "hidden",
  },
  uploadingBody: { flex: 1, gap: spacing.sm },
  uploadingThumbnail: { borderRadius: radii.control, height: 56, width: 44 },
});
