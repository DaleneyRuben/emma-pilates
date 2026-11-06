import {
  getListCurrentClientInvoicesQueryKey,
  useListCurrentClientInvoices,
  type ClientInvoiceDto,
} from "@pilates/api-contracts";
import {
  colors,
  EmptyState,
  fontFamilies,
  formatBolivianos,
  Glyph,
  IconRowGroup,
  LoadingState,
  QueryFailure,
  Screen,
  ScreenTopBar,
  spacing,
  typography,
  usePullToRefresh,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useClientFetcher } from "../client-fetcher";
import { invoiceDate, InvoicePill, invoiceStateLabel } from "./invoice-parts";

type InvoicesNavigation = {
  goBack: () => void;
  navigate: (screen: "InvoiceDetail", params: { paymentId: string }) => void;
};

function InvoiceRow({ invoice, onPress }: { invoice: ClientInvoiceDto; onPress: () => void }) {
  const date = invoiceDate(invoice.paidAt);
  const amount = formatBolivianos(invoice.amountDueCentavos);
  return (
    <Pressable
      accessibilityLabel={`${invoice.purchaseLabel}, ${date}, ${amount}, ${invoiceStateLabel(invoice)}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.disc}>
        <Glyph name="receipt" size={18} strokeWidth={1.5} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{invoice.purchaseLabel}</Text>
        <Text style={styles.muted}>{`${date} · ${amount}`}</Text>
      </View>
      <InvoicePill invoice={invoice} />
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

  return (
    <Screen style={styles.screen}>
      {header}
      {items.length === 0 ? (
        <EmptyState
          icon="receipt"
          message="Cuando pidas factura al pagar, el estudio la sube aquí y te avisamos."
          title="Aún no tienes facturas"
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
          <IconRowGroup>
            {items.map((invoice) => (
              <InvoiceRow
                invoice={invoice}
                key={invoice.paymentId}
                onPress={() =>
                  navigation.navigate("InvoiceDetail", { paymentId: invoice.paymentId })
                }
              />
            ))}
          </IconRowGroup>
          <Text style={styles.muted}>
            Las facturas salen a nombre del NIT o CI que diste al pagar. Si un dato está mal,
            avísale al estudio.
          </Text>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xl, paddingTop: spacing.md },
  disc: {
    alignItems: "center",
    backgroundColor: colors.primaryTint,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  muted: {
    color: colors.textMuted,
    fontFamily: fontFamilies.body,
    fontSize: typography.note,
    lineHeight: 19,
  },
  pressed: { backgroundColor: colors.rowHover },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 68,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  screen: { paddingHorizontal: spacing.xlSm },
  text: { flex: 1, gap: 2 },
  title: { color: colors.text, fontFamily: fontFamilies.body, fontSize: typography.bodyMedium },
});
