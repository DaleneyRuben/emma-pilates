import {
  getListCurrentClientInvoicesQueryKey,
  useListCurrentClientInvoices,
  type ClientInvoiceDto,
} from "@pilates/api-contracts";
import {
  Chevron,
  colors,
  EmptyState,
  formatBolivianos,
  Glyph,
  LoadingState,
  QueryFailure,
  rosa,
  Screen,
  ScreenTopBar,
  spacing,
  SplitPanels,
  surfaces,
  Text,
  usePullToRefresh,
  useWideScreen,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { ProfileRowCard } from "../profile/profile-rows";
import { InvoicePanel } from "./invoice-panel";
import { invoiceDate, InvoiceState, invoiceStateLabel } from "./invoice-parts";

type InvoicesNavigation = {
  goBack: () => void;
  navigate: (screen: "InvoiceDetail", params: { paymentId: string }) => void;
};

function InvoiceRow({
  invoice,
  onPress,
  selected = false,
}: {
  invoice: ClientInvoiceDto;
  onPress: () => void;
  selected?: boolean;
}) {
  const date = invoiceDate(invoice.paidAt);
  const amount = formatBolivianos(invoice.amountDueCentavos);
  return (
    <Pressable
      accessibilityLabel={`${invoice.purchaseLabel}, ${date}, ${amount}, ${invoiceStateLabel(invoice)}`}
      accessibilityRole="button"
      accessibilityState={selected ? { selected } : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.row, (pressed || selected) && styles.pressed]}
    >
      {/* C17 (Rosa Emma): the glyph on a 36 pt 50 disc. */}
      <View style={styles.disc} testID="invoice-row-disc">
        <View testID="invoice-row-glyph">
          <Glyph color={colors.text} name="document" size={18} strokeWidth={1.6} />
        </View>
      </View>
      <View style={styles.text}>
        <Text variant="titulo-fila">{invoice.purchaseLabel}</Text>
        <Text variant="secundario">{`${date} · ${amount}`}</Text>
      </View>
      <InvoiceState invoice={invoice} />
      <Chevron size={16} strokeWidth={1.5} />
    </Pressable>
  );
}

// FIX-044 (follow-up 248, K2/K3): every invoice she asked for, ready to
// download or still being prepared; a voided sale's invoice stays, marked.
export function MyInvoicesScreen() {
  const navigation = useNavigation<InvoicesNavigation>();
  const fetcher = useClientFetcher();
  const list = useListCurrentClientInvoices({ fetcher, query: { refetchOnMount: "always" } });
  const refreshControl = usePullToRefresh([getListCurrentClientInvoicesQueryKey()]);
  const wide = useWideScreen();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const close = useCallback(() => setSelectedId(null), []);
  const header = <ScreenTopBar fullBleed onBack={() => navigation.goBack()} title="Mis facturas" />;

  if (list.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando facturas" />
      </Screen>
    );
  }
  if (list.isError || list.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure label="No pudimos cargar tus facturas." onRetry={() => void list.refetch()} />
      </Screen>
    );
  }
  const items = list.data.data.items;
  const rows = (
    <>
      <ProfileRowCard>
        {items.map((invoice) => (
          <InvoiceRow
            invoice={invoice}
            key={invoice.paymentId}
            onPress={() =>
              wide
                ? setSelectedId(invoice.paymentId)
                : navigation.navigate("InvoiceDetail", { paymentId: invoice.paymentId })
            }
            selected={wide && invoice.paymentId === selectedId}
          />
        ))}
      </ProfileRowCard>
      <View style={styles.noteCard}>
        <Text variant="secundario">
          Las facturas salen a nombre del NIT o CI que diste al pagar. Si un dato está mal, avísale
          al estudio.
        </Text>
      </View>
    </>
  );

  return (
    <Screen style={styles.screen}>
      {header}
      {items.length === 0 ? (
        <EmptyState
          icon="receipt"
          message="Cuando pidas factura al pagar, el estudio la sube aquí y te avisamos."
          title="Aún no tienes facturas"
        />
      ) : wide ? (
        // 17T (the S04 split): the list in the 392 pt panel, the chosen invoice beside it.
        <SplitPanels
          detail={<InvoicePanel onClose={close} paymentId={selectedId} />}
          list={
            <ScrollView contentContainerStyle={styles.panelList} refreshControl={refreshControl}>
              {rows}
            </ScrollView>
          }
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
          {rows}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xl, paddingTop: spacing.xs },
  disc: {
    alignItems: "center",
    backgroundColor: rosa[50],
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  panelList: { gap: spacing.mdLg, padding: spacing.xl },
  noteCard: { ...surfaces.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.mdLg },
  pressed: { backgroundColor: colors.rowHover },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  screen: { gap: spacing.md },
  text: { flex: 1, gap: 2 },
});
