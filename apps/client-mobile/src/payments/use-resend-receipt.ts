import {
  createPurchaseIntent,
  getCurrentPurchaseIntent,
  getGetCurrentPurchaseIntentQueryKey,
} from "@pilates/api-contracts";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useState } from "react";

import { problemCode } from "../booking/booking-rejection-copy";
import { useClientFetcher } from "../client-fetcher";

type ResendNavigation = {
  navigate: (screen: "Payment", params: { purchaseIntentId: string }) => void;
};

const failure = "No pudimos iniciar un nuevo pago. Inténtalo de nuevo.";

/**
 * «Subir otro comprobante» after a rejection (owner, 2026-11-05: only another
 * receipt for the same Plan). A payment she already started and left open
 * is resumed instead of failing with `purchase_intent_open_exists`.
 */
export function useResendReceipt() {
  const navigation = useNavigation<ResendNavigation>();
  const fetcher = useClientFetcher();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resend = async (planId: string) => {
    setError(null);
    setBusy(true);
    try {
      const created = await createPurchaseIntent(
        { planId },
        { headers: { "idempotency-key": randomUUID() } },
        fetcher,
      );
      if (created.status === 201) {
        await queryClient.invalidateQueries({ queryKey: getGetCurrentPurchaseIntentQueryKey() });
        navigation.navigate("Payment", { purchaseIntentId: created.data.id });
        return;
      }
      if (problemCode(created.data) === "purchase_intent_open_exists") {
        const open = await getCurrentPurchaseIntent(undefined, fetcher);
        if (open.status === 200) {
          navigation.navigate("Payment", { purchaseIntentId: open.data.id });
          return;
        }
      }
      setError(failure);
    } catch {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, resend };
}
