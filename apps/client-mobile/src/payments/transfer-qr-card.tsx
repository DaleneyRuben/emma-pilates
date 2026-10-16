import { getGetTransferQrImageUrl } from "@pilates/api-contracts";
import {
  BodyText,
  colors,
  encodeBase64,
  fontFamilies,
  FullScreenImage,
  LineIcon,
  radii,
  spacing,
  surfaces,
} from "@pilates/mobile-core";
import { useEffect, useState, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Polyline } from "react-native-svg";

const qrBox = 190;

// The studio QR is a backend-owned, authenticated image; it is loaded through
// the API fetcher and rendered inline instead of exposing a bucket URL.
function useQrImage(fetcher: typeof globalThis.fetch): string | null {
  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetcher(getGetTransferQrImageUrl())
      .then(async (response) => {
        if (!response.ok) return;
        const bytes = new Uint8Array(await response.arrayBuffer());
        const type = response.headers.get("Content-Type") ?? "image/png";
        if (active) setUri(`data:${type};base64,${encodeBase64(bytes)}`);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [fetcher]);

  return uri;
}

/** Width over height of an image, or null until it is known. */
function useAspectRatio(uri: string | null): number | null {
  const [ratio, setRatio] = useState<{ ratio: number; uri: string } | null>(null);

  useEffect(() => {
    if (uri === null) return undefined;
    let active = true;
    Image.getSize(
      uri,
      (width, height) => {
        if (active && width > 0 && height > 0) setRatio({ ratio: width / height, uri });
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [uri]);

  return ratio !== null && ratio.uri === uri ? ratio.ratio : null;
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
 * light full-screen view from the QR itself or «Ampliar».
 */
export function TransferQrCard({ fetcher }: { fetcher: typeof globalThis.fetch }) {
  const uri = useQrImage(fetcher);
  const ratio = useAspectRatio(uri) ?? 1;
  const [enlarged, setEnlarged] = useState(false);
  const size =
    ratio >= 1 ? { height: qrBox / ratio, width: qrBox } : { height: qrBox, width: qrBox * ratio };

  return (
    <View style={styles.card}>
      {uri === null ? (
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
          </View>
        </>
      )}
      <BodyText style={styles.centered}>
        Escanea el código con tu app bancaria y transfiere el monto exacto.
      </BodyText>
      <FullScreenImage
        aspectRatio={ratio}
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
    color: colors.primaryDeep,
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 14,
  },
  actions: { flexDirection: "row", gap: spacing.xl, justifyContent: "center" },
  card: {
    ...surfaces.card,
    alignItems: "center",
    gap: spacing.mdLg,
    padding: spacing.lg,
  },
  centered: { textAlign: "center" },
  placeholder: {
    backgroundColor: colors.divider,
    borderRadius: radii.control,
    height: qrBox,
    width: qrBox,
  },
});
