import { useListStaffInvoices, type StaffInvoiceDto, formatMoney } from "@pilates/api-contracts";
import {
  EmptyState,
  LoadingState,
  QueryFailure,
  Screen,
  SegmentedTabs,
  spacing,
  surfaces,
  Text,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { bodyScroll, RowCard } from "../ui/card-pieces";
import { useStaffFetcher } from "../staff-fetcher";
import { BackBar } from "../ui/back-bar";
import { PersonRow } from "../ui/person-row";

type InvoicesNavigation = {
  goBack: () => void;
  navigate: (screen: "Invoice", params: { paymentId: string }) => void;
};

type Filter = "pending" | "uploaded";

/** The pending count for the «Facturas por subir» entry rows. */
export function usePendingInvoiceCount(): number {
  const fetcher = useStaffFetcher();
  const list = useListStaffInvoices(
    { filter: "pending" },
    { fetcher, query: { refetchOnMount: "always" } },
  );
  return list.data?.status === 200 ? list.data.data.items.length : 0;
}

const detailOf = (invoice: StaffInvoiceDto, filter: Filter) =>
  filter === "pending" || invoice.file === null
    ? `NIT ${invoice.invoiceData?.taxId ?? ""} · ${invoice.purchaseLabel}`
    : `NIT ${invoice.invoiceData?.taxId ?? ""} · subida por ${invoice.file.uploadedByName.split(" ")[0]}`;

// FIX-044 (follow-up 248, E4): the confirmed sales whose Client asked an
// invoice, still to upload, and the ones already uploaded.
export function InvoicesScreen() {
  const navigation = useNavigation<InvoicesNavigation>();
  const fetcher = useStaffFetcher();
  const [filter, setFilter] = useState<Filter>("pending");
  const list = useListStaffInvoices({ filter }, { fetcher, query: { refetchOnMount: "always" } });
  const items = list.data?.status === 200 ? list.data.data.items : [];
  const pendingCount = usePendingInvoiceCount();

  const tabs = (
    <SegmentedTabs
      accessibilityLabel="Facturas"
      onSelect={setFilter}
      options={[
        { key: "pending", label: `Por subir · ${pendingCount}` },
        { key: "uploaded", label: "Subidas" },
      ]}
      selected={filter}
    />
  );

  let body;
  if (list.isPending) {
    body = <LoadingState label="Cargando facturas" />;
  } else if (list.isError || list.data.status !== 200) {
    body = (
      <QueryFailure label="No pudimos cargar las facturas." onRetry={() => void list.refetch()} />
    );
  } else if (items.length === 0) {
    body =
      filter === "pending" ? (
        <EmptyState
          icon="receipt"
          message="Cuando una clienta pida factura y confirmes su pago, aparece aquí."
          title="No hay facturas por subir"
        />
      ) : (
        <EmptyState icon="receipt" message="Todavía no se subió ninguna." title="Sin facturas" />
      );
  } else {
    body = (
      <>
        <RowCard>
          {items.map((invoice) => (
            <PersonRow
              accessibilityLabel={`${invoice.clientName}, ${detailOf(invoice, filter)}`}
              amount={formatMoney(invoice.amountDueCentavos)}
              detail={detailOf(invoice, filter)}
              key={invoice.paymentId}
              name={invoice.clientName}
              onPress={() => navigation.navigate("Invoice", { paymentId: invoice.paymentId })}
            />
          ))}
        </RowCard>
        {filter === "pending" ? (
          <View style={styles.noteCard}>
            <Text variant="cuerpo">Pagos confirmados de clientas que pidieron factura.</Text>
          </View>
        ) : null}
      </>
    );
  }

  return (
    <Screen style={styles.screen}>
      <BackBar onBack={() => navigation.goBack()} title="Facturas" />
      <ScrollView contentContainerStyle={bodyScroll.content} style={bodyScroll.scroll}>
        {tabs}
        {body}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Rosa Emma: a quiet line sits in a white card, never on the 100 screen.
  noteCard: { ...surfaces.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  screen: { paddingHorizontal: spacing.xlSm },
});
