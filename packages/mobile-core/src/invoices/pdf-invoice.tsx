import { useQueries, useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Line } from "react-native-svg";

import { fontFamilies } from "../ui/fonts";
import { Glyph } from "../ui/glyph";
import { LineIcon } from "../ui/line-icon";
import { colors, radii, spacing, typography } from "../ui/tokens";
import { loadPdfPage, type PdfPage } from "./load-pdf-page";

const pagesLabel = (count: number) => (count === 1 ? "1 página" : `${count} páginas`);

/**
 * Design follow-up 256 § 3 (V-A1, V-A2, V-A3): a PDF invoice's first page
 * like a photo, with «Ver · N páginas»; a tap opens every page in a dark
 * full-screen viewer, pinch to zoom, with the app's `footer` under it.
 * `compact` is the Staff app's small thumbnail beside the file's name.
 */
export function PdfInvoice({
  cacheKey,
  compact = false,
  fetcher,
  fileName,
  footer,
  pageUrl,
}: {
  cacheKey: readonly unknown[];
  compact?: boolean;
  fetcher: typeof globalThis.fetch;
  /** Shown with a document glyph when the first page cannot be drawn. */
  fileName: string;
  footer?: ReactNode;
  pageUrl: (page: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const first = useQuery({
    queryKey: [...cacheKey, "pdf-page", 1],
    queryFn: () => loadPdfPage(fetcher, pageUrl(1)),
    retry: 1,
  });
  const count = first.data?.pageCount ?? 1;

  if (first.isError) {
    return (
      <View
        accessibilityLabel="Factura en PDF"
        style={[styles.placeholder, compact && styles.compactPage]}
      >
        <Glyph name="document" size={compact ? 22 : 40} strokeWidth={1.2} />
        {compact ? null : (
          <Text numberOfLines={2} style={styles.fileName}>
            {fileName}
          </Text>
        )}
      </View>
    );
  }

  if (first.data === undefined) {
    return (
      <View style={[styles.placeholder, compact && styles.compactPage]}>
        <ActivityIndicator accessibilityLabel="Cargando la factura" color={colors.primary} />
      </View>
    );
  }
  return (
    <>
      <Pressable
        accessibilityLabel={`Ver la factura, ${pagesLabel(count)}`}
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.thumbnail,
          compact && styles.compactPage,
          pressed && styles.pressed,
        ]}
      >
        <Image
          accessibilityLabel="Primera página de la factura"
          resizeMode="contain"
          source={{ uri: first.data.uri }}
          style={[styles.page, { aspectRatio: first.data.aspectRatio }]}
        />
        {compact ? null : (
          <View style={styles.pill}>
            <Text style={styles.pillLabel}>{`Ver · ${pagesLabel(count)}`}</Text>
          </View>
        )}
      </Pressable>
      <PdfInvoiceViewer
        cacheKey={cacheKey}
        fetcher={fetcher}
        first={first.data}
        footer={footer}
        key={open ? "open" : "closed"}
        onClose={() => setOpen(false)}
        pageUrl={pageUrl}
        visible={open}
      />
    </>
  );
}

function PdfInvoiceViewer({
  cacheKey,
  fetcher,
  first,
  footer,
  onClose,
  pageUrl,
  visible,
}: {
  cacheKey: readonly unknown[];
  fetcher: typeof globalThis.fetch;
  first: PdfPage;
  footer?: ReactNode;
  onClose: () => void;
  pageUrl: (page: number) => string;
  visible: boolean;
}) {
  const count = first.pageCount;
  const [current, setCurrent] = useState(1);
  const [offsets, setOffsets] = useState<number[]>([]);
  const rest = useQueries({
    queries: Array.from({ length: count - 1 }, (_, index) => ({
      queryKey: [...cacheKey, "pdf-page", index + 2],
      queryFn: () => loadPdfPage(fetcher, pageUrl(index + 2)),
      enabled: visible,
      retry: 1,
    })),
  });
  const pages: (PdfPage | undefined)[] = [first, ...rest.map((query) => query.data)];

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const top = event.nativeEvent.contentOffset.y + event.nativeEvent.layoutMeasurement.height / 3;
    const reached = offsets.filter((offset) => offset <= top).length;
    setCurrent(Math.min(count, Math.max(1, reached)));
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      testID="pdf-invoice-viewer"
      visible={visible}
    >
      <SafeAreaProvider>
        <SafeAreaView style={styles.viewer}>
          <View style={styles.topRow}>
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              hitSlop={spacing.md}
              onPress={onClose}
              style={styles.close}
            >
              <LineIcon color={colors.white} size={22} strokeWidth={1.3}>
                <Line x1="6" x2="18" y1="6" y2="18" />
                <Line x1="18" x2="6" y1="6" y2="18" />
              </LineIcon>
            </Pressable>
            <Text style={styles.title}>{`Factura · ${current} de ${count}`}</Text>
            <View style={styles.close} />
          </View>
          <ScrollView
            contentContainerStyle={styles.pages}
            maximumZoomScale={4}
            minimumZoomScale={1}
            onScroll={onScroll}
            scrollEventThrottle={64}
          >
            {pages.map((page, index) => (
              <View
                key={index}
                onLayout={(event) => {
                  const y = event.nativeEvent.layout.y;
                  setOffsets((known) => {
                    const next = [...known];
                    next[index] = y;
                    return next;
                  });
                }}
                style={styles.pageFrame}
              >
                {page === undefined ? (
                  <View style={styles.pendingPage}>
                    <ActivityIndicator color={colors.white} />
                  </View>
                ) : (
                  <Image
                    accessibilityLabel={`Página ${index + 1} de ${count}`}
                    resizeMode="contain"
                    source={{ uri: page.uri }}
                    style={[styles.page, { aspectRatio: page.aspectRatio }]}
                  />
                )}
              </View>
            ))}
          </ScrollView>
          {footer === undefined ? null : <View style={styles.footer}>{footer}</View>}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  close: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  compactPage: { alignSelf: "auto", width: 56 },
  fileName: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    textAlign: "center",
  },
  footer: { paddingBottom: spacing.lg, paddingHorizontal: spacing.xlSm, paddingTop: spacing.md },
  page: { backgroundColor: colors.white, width: "100%" },
  pageFrame: { alignSelf: "center", maxWidth: 720, width: "100%" },
  pages: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  pendingPage: {
    alignItems: "center",
    aspectRatio: 210 / 297,
    backgroundColor: "#2F2A28",
    justifyContent: "center",
    width: "100%",
  },
  pill: {
    backgroundColor: "rgba(74,74,74,0.72)",
    borderRadius: radii.pill,
    bottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    position: "absolute",
    right: spacing.sm,
  },
  pillLabel: {
    color: colors.white,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.note,
    fontWeight: "600",
  },
  placeholder: {
    alignItems: "center",
    alignSelf: "center",
    aspectRatio: 210 / 297,
    backgroundColor: colors.white,
    borderColor: colors.hairline,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    width: 220,
  },
  pressed: { opacity: 0.8 },
  thumbnail: {
    alignSelf: "center",
    borderColor: colors.hairline,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    width: 220,
  },
  title: {
    color: colors.white,
    flex: 1,
    fontFamily: fontFamilies.bodyStrong,
    fontSize: typography.body,
    fontWeight: "600",
    textAlign: "center",
  },
  topRow: { alignItems: "center", flexDirection: "row", paddingHorizontal: spacing.sm },
  viewer: { backgroundColor: "#1B1716", flex: 1 },
});
