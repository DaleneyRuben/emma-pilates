import { getGetStaffInvoiceUploadPageUrl } from "@pilates/api-contracts";
import {
  brand,
  colors,
  Glyph,
  LineIcon,
  loadPdfPage,
  OutlinedButton,
  radii,
  spacing,
  Text,
} from "@pilates/mobile-core";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Path } from "react-native-svg";

// E-D29's arrows either side of «Página 1 de 2».
const arrow = (path: string) => (
  <LineIcon color={colors.text} size={20} strokeWidth={1.7}>
    <Path d={path} />
  </LineIcon>
);

/**
 * E-D29 (walkthrough n.º 24): the chosen PDF big, before it is sent. A white
 * page like E-D30: its name as the title and «× Cerrar»; the pages one at a
 * time on a bordered sheet, swiped or stepped with the arrows around «Página
 * 1 de 2»; «Cambiar» under it. The API draws the uploaded file's pages
 * (ADR-0110); only her own unattached upload is served.
 */
export function PickedPdfViewer({
  assetId,
  fetcher,
  fileName,
  onChange,
  onClose,
  visible,
}: {
  assetId: string | null;
  fetcher: typeof globalThis.fetch;
  fileName: string;
  onChange: () => void;
  onClose: () => void;
  visible: boolean;
}) {
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      testID="picked-pdf-viewer"
      visible={visible && assetId !== null}
    >
      {assetId === null ? null : (
        <SafeAreaProvider>
          <SafeAreaView style={styles.viewer}>
            <View style={styles.topRow}>
              <Text accessibilityRole="header" style={styles.title} variant="titulo-pagina">
                {fileName}
              </Text>
              <Pressable
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
                hitSlop={spacing.md}
                onPress={onClose}
                style={styles.close}
              >
                <Glyph color={colors.text} name="cross" size={18} strokeWidth={1.7} />
                <Text variant="boton">Cerrar</Text>
              </Pressable>
            </View>
            <Pages assetId={assetId} fetcher={fetcher} />
            <OutlinedButton label="Cambiar" onPress={onChange} />
          </SafeAreaView>
        </SafeAreaProvider>
      )}
    </Modal>
  );
}

function Pages({ assetId, fetcher }: { assetId: string; fetcher: typeof globalThis.fetch }) {
  const cacheKey = ["staff-invoice-upload-pages", assetId];
  const pageUrl = (page: number) => getGetStaffInvoiceUploadPageUrl(assetId, page);
  const [current, setCurrent] = useState(1);
  const [width, setWidth] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const first = useQuery({
    queryKey: [...cacheKey, 1],
    queryFn: () => loadPdfPage(fetcher, pageUrl(1)),
    retry: 1,
  });
  const count = first.data?.pageCount ?? 1;
  const rest = useQueries({
    queries: Array.from({ length: count - 1 }, (_, index) => ({
      queryKey: [...cacheKey, index + 2],
      queryFn: () => loadPdfPage(fetcher, pageUrl(index + 2)),
      enabled: first.data !== undefined,
      retry: 1,
    })),
  });
  const pages = [first, ...rest];

  const go = (page: number) => {
    const next = Math.min(count, Math.max(1, page));
    setCurrent(next);
    scroller.current?.scrollTo({ animated: true, x: (next - 1) * width });
  };
  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setCurrent(Math.round(event.nativeEvent.contentOffset.x / width) + 1);
  };

  return (
    <>
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={styles.sheet}
        testID="picked-pdf-pages"
      >
        {first.isError ? (
          <View style={styles.pending}>
            <Glyph name="document" size={40} strokeWidth={1.2} />
            <Text style={styles.centered} variant="secundario">
              No pudimos mostrar las páginas. Puedes subirla igual.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            onMomentumScrollEnd={settle}
            pagingEnabled
            ref={scroller}
            showsHorizontalScrollIndicator={false}
          >
            {pages.map((query, index) => (
              <View key={index} style={[styles.page, width > 0 && { width }]}>
                {query.data === undefined ? (
                  <View style={styles.pending}>
                    <ActivityIndicator
                      accessibilityLabel="Cargando la página"
                      color={colors.text}
                    />
                  </View>
                ) : (
                  <Image
                    accessibilityLabel={`Página ${index + 1} de la factura`}
                    resizeMode="contain"
                    source={{ uri: query.data.uri }}
                    style={styles.image}
                  />
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      <View style={styles.indicator}>
        <Pressable
          accessibilityLabel="Página anterior"
          accessibilityRole="button"
          accessibilityState={{ disabled: current <= 1 }}
          disabled={current <= 1}
          hitSlop={spacing.md}
          onPress={() => go(current - 1)}
          style={current <= 1 && styles.dimmed}
        >
          {arrow("M15 5l-7 7 7 7")}
        </Pressable>
        <Text variant="titulo-fila">{`Página ${current} de ${count}`}</Text>
        <Pressable
          accessibilityLabel="Página siguiente"
          accessibilityRole="button"
          accessibilityState={{ disabled: current >= count }}
          disabled={current >= count}
          hitSlop={spacing.md}
          onPress={() => go(current + 1)}
          style={current >= count && styles.dimmed}
        >
          {arrow("M9 5l7 7-7 7")}
        </Pressable>
      </View>
      <Text style={styles.centered} variant="secundario">
        Desliza para pasar de página.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  centered: { textAlign: "center" },
  // E-D29: the × then «Cerrar», a text button 44 pt tall to tap.
  close: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: spacing.smd,
    minHeight: 44,
  },
  dimmed: { opacity: 0.3 },
  image: { flex: 1, width: "100%" },
  indicator: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.lg,
    justifyContent: "center",
  },
  page: { flex: 1, padding: spacing.lg },
  pending: { alignItems: "center", flex: 1, gap: spacing.md, justifyContent: "center" },
  // E-D29: a white sheet, 16 pt corners, a 1.5 pt 400 line inside.
  sheet: {
    backgroundColor: colors.card,
    borderColor: brand.arcilla,
    borderRadius: radii.button,
    borderWidth: 1.5,
    flex: 1,
    overflow: "hidden",
  },
  title: { flex: 1 },
  topRow: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  viewer: {
    backgroundColor: colors.card,
    flex: 1,
    gap: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
