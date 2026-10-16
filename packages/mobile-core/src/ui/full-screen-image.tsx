import type { ReactNode } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Line } from "react-native-svg";

import { BodyText } from "./body-text";
import { fontFamilies } from "./fonts";
import { LineIcon } from "./line-icon";
import { colors, spacing, surfaces, typography } from "./tokens";

/**
 * An image over the whole screen, drawn whole and pinch-zoomable, closed by
 * «Cerrar» or the back gesture. «dark» is the photo viewer of a receipt
 * (S12); «light» is the studio QR on Superficie (follow-up 95), which scans
 * best dark on light and sits on a card with an optional note and action.
 */
export function FullScreenImage({
  aspectRatio = 1,
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

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      testID="full-screen-image"
      visible={visible && uri !== null}
    >
      <SafeAreaProvider>
        <SafeAreaView style={[styles.viewer, light ? styles.lightViewer : styles.darkViewer]}>
          <View style={styles.topRow}>
            {title === undefined ? <View /> : <Text style={styles.title}>{title}</Text>}
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              hitSlop={spacing.md}
              onPress={onClose}
              style={styles.close}
            >
              <LineIcon color={light ? colors.text : colors.white} size={22} strokeWidth={1.3}>
                <Line x1="6" x2="18" y1="6" y2="18" />
                <Line x1="18" x2="6" y1="6" y2="18" />
              </LineIcon>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={light ? styles.lightContent : styles.darkContent}
            maximumZoomScale={4}
            minimumZoomScale={1}
          >
            {light ? (
              <View style={styles.card} testID="full-screen-image-card">
                {image}
              </View>
            ) : (
              image
            )}
            {note === undefined ? null : <BodyText style={styles.note}>{note}</BodyText>}
          </ScrollView>
          {footer === undefined ? null : <View style={styles.footer}>{footer}</View>}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // A phone column on a tablet: the QR stays scannable without leaving the screen.
  card: { ...surfaces.flatCard, maxWidth: 480, padding: spacing.xlSm, width: "100%" },
  close: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  darkContent: { flexGrow: 1 },
  darkImage: { height: "100%", width: "100%" },
  darkViewer: { backgroundColor: "#1B1716" },
  footer: { paddingBottom: spacing.xl, paddingHorizontal: spacing.xlSm },
  lightContent: {
    alignItems: "center",
    gap: spacing.lgXl,
    paddingHorizontal: spacing.xlSm,
    paddingTop: spacing.xl,
  },
  lightImage: { width: "100%" },
  lightViewer: { backgroundColor: colors.surface },
  note: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 300,
    textAlign: "center",
  },
  title: {
    color: colors.text,
    fontFamily: fontFamilies.heading,
    fontSize: typography.titleSmall,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: spacing.xlSm,
    paddingRight: spacing.lg,
  },
  viewer: { flex: 1 },
});
