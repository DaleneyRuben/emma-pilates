import {
  createPurchaseIntent,
  getCurrentPurchaseIntent,
  getGetCurrentPurchaseIntentQueryKey,
} from "@pilates/api-contracts";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { randomUUID } from "expo-crypto";
import { useRef, useState } from "react";

import { problemCode } from "../booking/booking-rejection-copy";
import { useClientFetcher } from "../client-fetcher";

type ResendNavigation = {
  navigate: {
    (screen: "Payment", params: { purchaseIntentId: string }): void;
    (screen: "Plans", params: { rejectedPlanGone: true }): void;
  };
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
  // State updates land after a re-render; a second tap before it must not
  // start a second Purchase Intent.
  const inFlight = useRef(false);

  const resend = async (planId: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
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
      const code = problemCode(created.data);
      // The rejected Plan is hidden or no longer sold: she picks another.
      if (code === "plan_not_purchasable") {
        navigation.navigate("Plans", { rejectedPlanGone: true });
        return;
      }
      if (code === "purchase_intent_open_exists") {
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
      inFlight.current = false;
      setBusy(false);
    }
  };

  return { busy, error, resend };
}
