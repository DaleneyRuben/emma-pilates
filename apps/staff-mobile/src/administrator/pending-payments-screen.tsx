import {
  getListPendingPaymentsQueryKey,
  useListPendingPayments,
  useListRequestedFreezes,
  formatMoney,
} from "@pilates/api-contracts";
import {
  BrandToast,
  ClientFace,
  colors,
  EmphasisCard,
  formatNotificationTime,
  Glyph,
  LoadingState,
  QueryFailure,
  Screen,
  spacing,
  surfaces,
  Text,
  usePullToRefresh,
  useRefetchOnFocus,
  useStickyNotice,
} from "@pilates/mobile-core";
import { useNavigation } from "@react-navigation/native";
import { ScrollView, StyleSheet, View } from "react-native";

import { usePendingInvoiceCount } from "../invoices/invoices-screen";

import { useImpersonation } from "../impersonation/impersonation-context";
import { describeSale } from "./administrator-format";
import { bodyScroll, RowCard } from "../ui/card-pieces";
import { useOwnRoleLabel } from "../profile/staff-labels";
import { useStaffFetcher } from "../staff-fetcher";
import { PersonRow } from "../ui/person-row";
import { PlainRow } from "../ui/plain-rows";
import { RootHeader } from "../ui/root-header";

export type PaymentsNotice =
  | "Pago confirmado"
  | "Pago rechazado"
  | `Plan siguiente programado desde el ${string}`
  | `Plan programado desde el ${string}`;

type PendingPaymentsNavigation = {
  navigate: {
    (screen: "ReviewPayment", params: { paymentId: string }): void;
    (screen: "CancelClass" | "CashClose" | "Freezes" | "Invoices"): void;
  };
  setParams: (params: { notice?: PaymentsNotice }) => void;
};

export function PendingPaymentsScreen({
  route,
}: {
  route: { params?: { notice?: PaymentsNotice } };
}) {
  const navigation = useNavigation<PendingPaymentsNavigation>();
  const fetcher = useStaffFetcher();
  // FIX-081: the person's Role, «Administradora» or «Administrador».
  const roleLabel = useOwnRoleLabel();
  const pending = useListPendingPayments({
    fetcher,
    query: { refetchOnMount: "always" },
  });
  const freezes = useListRequestedFreezes({ fetcher });
  const freezeCount = freezes.data?.status === 200 ? freezes.data.data.length : 0;
  const invoiceCount = usePendingInvoiceCount();
  const queryKeys = [getListPendingPaymentsQueryKey()];
  useRefetchOnFocus(queryKeys);
  const refreshControl = usePullToRefresh(queryKeys);
  // Confirming or rejecting returns here with a toast that stays until closed
  // or the screen changes (follow-up 225 §7).
  const clearPaymentsNotice = () => navigation.setParams({ notice: undefined });
  const paymentsNotice = useStickyNotice(route.params?.notice, clearPaymentsNotice);
  // FUT-001: «Salir» or the expiry of an Impersonation lands here with its line.
  const impersonation = useImpersonation();
  const impersonationNotice = useStickyNotice(
    impersonation.notice ?? undefined,
    impersonation.clearNotice,
  );
  const notice = paymentsNotice ?? impersonationNotice;
  const toast =
    notice === null ? null : (
      <BrandToast
        onClose={paymentsNotice !== null ? clearPaymentsNotice : impersonation.clearNotice}
        title={notice}
      />
    );

  const header = (
    <RootHeader bell eyebrow={roleLabel} label="Pagos pendientes" title="Pagos pendientes" />
  );
  // Owner, 2026-11-02: what used to sit in the header opens from Pagos.
  // Rosa Emma (E-D01): the label sits inside the white card.
  const shortcuts = (
    <RowCard label="Accesos">
      <PlainRow
        label="Facturas por subir"
        onPress={() => navigation.navigate("Invoices")}
        testID="pending-payments-invoices"
        value={invoiceCount > 0 ? String(invoiceCount) : undefined}
      />
      <PlainRow
        label="Cancelar una clase"
        onPress={() => navigation.navigate("CancelClass")}
        testID="pending-payments-cancel-class"
      />
      <PlainRow
        label="Congelamientos"
        onPress={() => navigation.navigate("Freezes")}
        testID="pending-payments-freezes"
        value={freezeCount > 0 ? `${freezeCount} por revisar` : undefined}
      />
      <PlainRow
        label="Cerrar caja"
        onPress={() => navigation.navigate("CashClose")}
        testID="cash-close-entry"
      />
    </RowCard>
  );

  if (pending.isPending) {
    return (
      <Screen style={styles.screen}>
        {header}
        <LoadingState label="Cargando pagos" />
        {toast}
      </Screen>
    );
  }
  if (pending.isError || pending.data.status !== 200) {
    return (
      <Screen style={styles.screen}>
        {header}
        <QueryFailure
          label="No pudimos cargar los pagos pendientes."
          onRetry={() => void pending.refetch()}
        />
        {toast}
      </Screen>
    );
  }

  const payments = pending.data.data;
  const total = payments.reduce((sum, payment) => sum + payment.amountDueCentavos, 0);
  const now = new Date();

  return (
    <Screen style={styles.screen}>
      {/* The staff boards keep the band fixed above the scrolling body. */}
      {header}
      <ScrollView
        contentContainerStyle={bodyScroll.content}
        refreshControl={refreshControl}
        style={bodyScroll.scroll}
      >
        {payments.length === 0 ? (
          // FIX-083 (Ronda 2 pick A): one small line, not half a screen.
          <View
            accessibilityLabel="Todo al día. No hay pagos por confirmar"
            accessible
            style={styles.allClear}
            testID="pending-payments-all-clear"
          >
            <Glyph color={colors.successText} name="check" size={22} strokeWidth={1.7} />
            <View style={styles.allClearText}>
              <Text variant="titulo-fila">Todo al día</Text>
              <Text variant="secundario">No hay pagos por confirmar</Text>
            </View>
          </View>
        ) : (
          <>
            {/* E-D01: the pending total is the screen's one 600 hero. */}
            <View
              accessibilityLabel={`Por confirmar · ${payments.length} · ${formatMoney(total)} en total`}
              accessible
              testID="pending-payments-total"
            >
              <EmphasisCard eyebrow={`Por confirmar · ${payments.length}`}>
                <View style={styles.totalLine}>
                  <Text tone="onDark" variant="cifra-grande">
                    {formatMoney(total)}
                  </Text>
                  <Text tone="onDark" variant="destacado">
                    en total
                  </Text>
                </View>
              </EmphasisCard>
            </View>
            <RowCard>
              {payments.map((payment) => (
                <PersonRow
                  accessibilityLabel={`Revisar pago de ${payment.clientName}`}
                  amount={formatMoney(payment.amountDueCentavos)}
                  detail={`${describeSale(payment)} · ${formatNotificationTime(payment.submittedAt, now).toLowerCase()}`}
                  face={
                    <ClientFace
                      fetcher={fetcher}
                      name={payment.clientName}
                      photo={payment.clientPhoto}
                      size={36}
                    />
                  }
                  key={payment.id}
                  name={payment.clientName}
                  onPress={() => navigation.navigate("ReviewPayment", { paymentId: payment.id })}
                  testID={`pending-payment-${payment.id}`}
                />
              ))}
            </RowCard>
          </>
        )}
        {shortcuts}
      </ScrollView>
      {toast}
    </Screen>
  );
}

const styles = StyleSheet.create({
  allClear: {
    ...surfaces.card,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mdLg,
  },
  allClearText: { flex: 1, gap: spacing.xxs },
  screen: { paddingHorizontal: spacing.lg },
  totalLine: { alignItems: "baseline", flexDirection: "row", flexWrap: "wrap", gap: spacing.smLg },
});
