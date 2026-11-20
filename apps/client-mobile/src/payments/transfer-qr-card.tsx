import { getGetTransferQrImageUrl } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  encodeBase64,
  fontFamilies,
  FullScreenImage,
  LineIcon,
  PrimaryButton,
  QueryFailure,
  radii,
  spacing,
  surfaces,
} from "@pilates/mobile-core";
import { useEffect, useState, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Path, Polyline } from "react-native-svg";

import { imageSizeFromBytes } from "./image-size";
import { QrSaveFailure, QrSavedNotice } from "./qr-save-outcome";
import { useSaveQr } from "./save-qr";

const qrBox = 190;

// The studio QR is a backend-owned, authenticated image; it is loaded through
// the API fetcher and rendered inline instead of exposing a bucket URL. Its
// proportions come from its own header: Android does not measure a data URI.
function useQrImage(fetcher: typeof globalThis.fetch): {
  failed: boolean;
  qr: { ratio: number; uri: string } | null;
  retry: () => void;
} {
  const [qr, setQr] = useState<{ ratio: number; uri: string } | null>(null);
  // Walkthrough n.º 71: a QR that cannot load says so and offers Reintentar.
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => fetcher(getGetTransferQrImageUrl()))
      .then(async (response) => {
        if (!response.ok) throw new Error(`QR ${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        const type = response.headers.get("Content-Type") ?? "image/png";
        const size = imageSizeFromBytes(bytes);
        const ratio = size === null || size.height === 0 ? 1 : size.width / size.height;
        if (active) setQr({ ratio, uri: `data:${type};base64,${encodeBase64(bytes)}` });
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [attempt, fetcher]);

  return {
    failed,
    qr,
    retry: () => {
      setFailed(false);
      setAttempt((count) => count + 1);
    },
  };
}

/** «Ampliar» and «Guardar QR»: quiet text actions with a line icon (follow-up 95). */
function QrAction({
  children,
  label,
  onPress,
}: {
  children: ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.action}
    >
      <LineIcon color={colors.primaryDeep} size={16} strokeWidth={1.3}>
        {children}
      </LineIcon>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

/**
 * Client 10's studio QR (follow-up 95): drawn whole at its own proportions
 * (a non-square bank QR loses its edges when cropped), and enlarged on a
 * light full-screen view from the QR itself or «Ampliar». «Guardar QR», under
 * the QR and in the view, adds it to the photo library (MOB-063).
 */
export function TransferQrCard({
  amount,
  fetcher,
}: {
  /** «Bs 70» when the screen names a fixed amount (follow-up 262). */
  amount?: string;
  fetcher: typeof globalThis.fetch;
}) {
  const { failed, qr, retry } = useQrImage(fetcher);
  const uri = qr?.uri ?? null;
  const ratio = qr?.ratio ?? 1;
  const [enlarged, setEnlarged] = useState(false);
  const { failedAt, save, savedAt, saving } = useSaveQr(uri);
  const size =
    ratio >= 1 ? { height: qrBox / ratio, width: qrBox } : { height: qrBox, width: qrBox * ratio };

  return (
    <View style={styles.card}>
      {uri === null && failed ? (
        <QueryFailure label="No pudimos cargar el QR del estudio." onRetry={retry} />
      ) : uri === null ? (
        <View style={styles.placeholder} />
      ) : (
        <>
          <Pressable
            accessibilityLabel="Código QR del estudio. Toca para ampliarlo."
            accessibilityRole="button"
            onPress={() => setEnlarged(true)}
          >
            <Image
              accessibilityLabel="Código QR del estudio"
              resizeMode="contain"
              source={{ uri }}
              style={size}
            />
          </Pressable>
          <View style={styles.actions}>
            <QrAction label="Ampliar" onPress={() => setEnlarged(true)}>
              <Polyline points="4,9 4,4 9,4" />
              <Polyline points="15,4 20,4 20,9" />
              <Polyline points="20,15 20,20 15,20" />
              <Polyline points="9,20 4,20 4,15" />
            </QrAction>
            <QrAction label="Guardar QR" onPress={() => void save("card")}>
              <Path d="M12 4v11" />
              <Polyline points="7.5,10.5 12,15 16.5,10.5" />
              <Path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15" />
            </QrAction>
          </View>
          {savedAt === "card" ? <QrSavedNotice /> : null}
          {failedAt === "card" ? <QrSaveFailure /> : null}
        </>
      )}
      <BodyText style={styles.centered}>
        {`Escanéalo con tu app bancaria y transfiere ${amount ?? "el monto exacto"}.`}
      </BodyText>
      <FullScreenImage
        aspectRatio={ratio}
        banner={savedAt === "view" ? <QrSavedNotice /> : undefined}
        footer={
          <View style={styles.footer}>
            <PrimaryButton busy={saving} label="Guardar QR" onPress={() => void save("view")} />
            {failedAt === "view" ? <QrSaveFailure /> : null}
          </View>
        }
        label="Código QR ampliado"
        note="Guárdalo para elegirlo desde la galería en tu app bancaria."
        onClose={() => setEnlarged(false)}
        title="QR del estudio"
        tone="light"
        uri={uri}
        visible={enlarged}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.smd,
    minHeight: 44,
    paddingHorizontal: spacing.xs,
  },
  actionLabel: {
    color: colors.text,
    fontFamily: fontFamilies.bodyBold,
    fontSize: 14,
    fontWeight: "700",
  },
  actions: { flexDirection: "row", gap: spacing.xl, justifyContent: "center" },
  card: {
    ...surfaces.card,
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  centered: { fontFamily: fontFamilies.body, fontSize: 14, lineHeight: 20, textAlign: "center" },
  footer: { gap: spacing.md },
  placeholder: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii.control,
    height: qrBox,
    width: qrBox,
  },
});
