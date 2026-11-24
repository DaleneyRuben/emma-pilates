import { EmptyState, spacing } from "@pilates/mobile-core";
import {
  NavigationContext,
  useNavigation,
  type NavigationProp,
  type ParamListBase,
} from "@react-navigation/native";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { InvoiceDetailScreen } from "./invoice-detail-screen";
import { InInvoicePanel } from "./invoice-panel-context";

/**
 * Mis facturas' detail panel on a tablet (17T, the S04 split): the invoice as
 * the phone pushes it, kept beside the list. Its «back» clears the choice;
 * any other move leaves Mis facturas as on a phone.
 */
export function InvoicePanel({
  onClose,
  paymentId,
}: {
  onClose: () => void;
  paymentId: string | null;
}) {
  const parent = useNavigation<NavigationProp<ParamListBase>>();
  const navigation = useMemo(
    () => ({ ...parent, goBack: onClose }) as unknown as NavigationProp<ParamListBase>,
    [onClose, parent],
  );

  if (paymentId === null) {
    return (
      <View style={styles.empty} testID="invoice-panel-empty">
        <EmptyState
          icon="receipt"
          message="Toca una factura de la lista para ver sus datos y descargarla aquí."
          title="Elige una factura"
          variant="panel"
        />
      </View>
    );
  }
  return (
    <InInvoicePanel value>
      <NavigationContext.Provider value={navigation}>
        <InvoiceDetailScreen key={paymentId} route={{ params: { paymentId } }} />
      </NavigationContext.Provider>
    </InInvoicePanel>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, justifyContent: "center", padding: spacing.xxl },
});
