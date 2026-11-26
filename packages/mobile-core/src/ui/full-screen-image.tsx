import type { ReactNode } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Line } from "react-native-svg";

import { LineIcon } from "./line-icon";
import { Text } from "./text";
import { colors, spacing } from "./tokens";

/**
 * An image over the whole screen, drawn whole and pinch-zoomable, closed by
 * «Cerrar» or the back gesture. «dark» is the photo viewer of a receipt
 * (S12). «light» is a white page (E-D30, C10v, the studio QR of follow-up
 * 95): the `titulo-pagina` title and a «Cerrar» text button with its × on one
 * row, the image filling the page and the `cuerpo` note under it, on no inner
 * card. `banner` sits under the top row for an action's outcome (MOB-063).
 */
export function FullScreenImage({
  aspectRatio = 1,
  banner,
  footer,
  label,
  note,
  onClose,
  title,
  tone = "dark",
  uri,
  visible,
}: {
  aspectRatio?: number;
  banner?: ReactNode;
  footer?: ReactNode;
  label: string;
  note?: string;
  onClose: () => void;
  title?: string;
  tone?: "dark" | "light";
  uri: string | null;
  visible: boolean;
}) {
  const light = tone === "light";
  const image =
    uri === null ? null : (
      <Image
        accessibilityLabel={label}
        resizeMode="contain"
        source={{ uri }}
        style={light ? [styles.lightImage, { aspectRatio }] : styles.darkImage}
      />
    );
  const cross = (size: number, color: string) => (
    <LineIcon color={color} size={size} strokeWidth={light ? 1.7 : 1.3}>
      <Line x1="6" x2="18" y1="6" y2="18" />
      <Line x1="18" x2="6" y1="6" y2="18" />
    </LineIcon>
  );

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      testID="full-screen-image"
      visible={visible && uri !== null}
    >
      <SafeAreaProvider>
        <SafeAreaView
          style={[styles.viewer, light ? styles.lightViewer : styles.darkViewer]}
          testID="full-screen-image-page"
        >
          <View style={light ? styles.lightTopRow : styles.topRow} testID="full-screen-image-top">
            {title === undefined ? (
              <View />
            ) : (
              <Text
                accessibilityRole="header"
                style={styles.title}
                tone={light ? "ink" : "onDark"}
                variant={light ? "titulo-pagina" : "titulo-seccion"}
              >
                {title}
              </Text>
            )}
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              hitSlop={spacing.md}
              onPress={onClose}
              style={light ? styles.lightClose : styles.close}
            >
              {light ? (
                <>
                  {cross(18, colors.text)}
                  <Text variant="boton">Cerrar</Text>
                </>
              ) : (
                cross(22, colors.white)
              )}
            </Pressable>
          </View>
          {banner === undefined ? null : <View style={styles.banner}>{banner}</View>}
          <ScrollView
            contentContainerStyle={light ? styles.lightContent : styles.darkContent}
            maximumZoomScale={4}
            minimumZoomScale={1}
          >
            {image}
            {note === undefined ? null : (
              <Text style={styles.note} tone={light ? "ink" : "onDark"} variant="cuerpo">
                {note}
              </Text>
            )}
          </ScrollView>
          {footer === undefined ? null : <View style={styles.footer}>{footer}</View>}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  banner: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  close: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  darkContent: { flexGrow: 1 },
  darkImage: { height: "100%", width: "100%" },
  darkViewer: { backgroundColor: colors.text },
  footer: { paddingBottom: spacing.xl, paddingHorizontal: spacing.lg },
  // A text button, 44 pt tall to tap: the × then «Cerrar».
  lightClose: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: spacing.smd,
    minHeight: 44,
  },
  lightContent: {
    alignItems: "center",
    flexGrow: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  // A phone column on a tablet: the QR stays scannable without leaving the screen.
  lightImage: { borderRadius: spacing.lg, maxWidth: 480, width: "100%" },
  lightTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  lightViewer: { backgroundColor: colors.card },
  note: { alignSelf: "center", maxWidth: 300, textAlign: "center" },
  title: { flex: 1 },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: spacing.xlSm,
    paddingRight: spacing.lg,
  },
  viewer: { flex: 1 },
});
