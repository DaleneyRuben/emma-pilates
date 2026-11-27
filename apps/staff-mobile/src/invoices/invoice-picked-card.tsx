import { colors, Glyph, radii, spacing, surfaces, Text } from "@pilates/mobile-core";
import { Image, Pressable, StyleSheet, View } from "react-native";

import type { PickedImage } from "../uploads/image-upload";
import type { PickedUpload } from "./use-picked-pdf-upload";

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
 * A PDF uploads at once with its progress (C10u) and, once up, opens its
 * pages (E-D29).
 */
export function PickedInvoiceCard({
  busy = false,
  onChange,
  onOpen,
  onRemove,
  picked,
  upload = { status: "idle" },
}: {
  /** While «Subir factura» sends it, the file cannot be changed (review). */
  busy?: boolean;
  onChange: () => void;
  onOpen: () => void;
  onRemove: () => void;
  picked: PickedImage;
  upload?: PickedUpload;
}) {
  const pdf = picked.mediaType === "application/pdf";
  return (
    <View style={styles.card} testID="invoice-picked">
      {pdf ? (
        <PickedPdf onOpen={onOpen} picked={picked} upload={upload} />
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
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={onChange}
        style={({ pressed }) => [styles.change, pressed && styles.pressed]}
      >
        <Text variant="boton-chico">Cambiar</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Quitar archivo"
        accessibilityRole="button"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        hitSlop={spacing.xs}
        onPress={onRemove}
        style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
      >
        <Glyph color={colors.text} name="cross" size={16} strokeWidth={1.6} />
      </Pressable>
    </View>
  );
}

function PickedPdf({
  onOpen,
  picked,
  upload,
}: {
  onOpen: () => void;
  picked: PickedImage;
  upload: PickedUpload;
}) {
  const icon = (
    <View style={styles.icon}>
      <Glyph color={colors.text} name="document" size={22} strokeWidth={1.6} />
    </View>
  );
  if (upload.status === "uploading") {
    const percent = Math.round(upload.progress * 100);
    return (
      <View accessibilityState={{ busy: true }} style={styles.file}>
        {icon}
        <View style={styles.uploading}>
          <Text numberOfLines={1} variant="titulo-fila">
            Subiendo factura
          </Text>
          <View style={styles.progress}>
            <View
              accessible
              accessibilityLabel="Avance de la subida"
              accessibilityRole="progressbar"
              accessibilityValue={{ max: 100, min: 0, now: percent }}
              style={styles.track}
            >
              <View style={[styles.fill, { width: `${percent}%` }]} />
            </View>
            <Text variant="secundario">{`${percent} %`}</Text>
          </View>
        </View>
      </View>
    );
  }
  const body = (
    <>
      {icon}
      <View style={styles.text}>
        <Text numberOfLines={1} variant="titulo-fila">
          {picked.fileName ?? "factura.pdf"}
        </Text>
        <Text variant="secundario">
          {upload.status === "failed"
            ? "No se pudo subir"
            : `PDF · ${pages(pdfPageCount(picked.bytes))} · ${kilobytes(picked.bytes.byteLength)}`}
        </Text>
      </View>
    </>
  );
  // E-D29 opens once the file is up: the API draws its pages.
  return upload.status === "ready" ? (
    <Pressable
      accessibilityLabel="Ver factura en grande"
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [styles.file, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  ) : (
    <View style={styles.file}>{body}</View>
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
  fill: { backgroundColor: colors.text, height: "100%" },
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
  progress: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  text: { flex: 1, gap: 2 },
  thumbnail: { borderRadius: radii.control, height: 50, width: 40 },
  // C10u's track: 6 pt, 50 with its hairline, filled in 600.
  track: {
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.hairline,
    borderRadius: 3,
    borderWidth: 1,
    flex: 1,
    height: 6,
    overflow: "hidden",
  },
  uploading: { flex: 1, gap: spacing.sm },
});
