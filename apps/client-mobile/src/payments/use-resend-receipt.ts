import {
  createPurchaseIntent,
  getCurrentPurchaseIntent,
  getGetCurrentPurchaseIntentQueryKey,
} from "@pilates/api-contracts";
import { boliviaCivilDate } from "@pilates/mobile-core";
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
    (screen: "PlanDetail", params: { planId: string }): void;
  };
};

/** The rejected payment the new one repeats: its Plan and chosen start. */
export type ResendablePayment = { planId: string; startsOn?: string };

// The start the server refuses for a repeat: she picks a new one on the Plan.
const startRefusals = new Set(["start_date_before_booked_class", "start_date_out_of_window"]);

const failure = "No pudimos iniciar un nuevo pago. Inténtalo de nuevo.";

/**
 * «Subir otro comprobante» after a rejection (owner, 2026-11-05: only another
 * receipt for the same Plan). A payment she already started and left open
 * is resumed instead of failing with `purchase_intent_open_exists`.
 * The new payment keeps the rejected one's start date while it is not past
 * (a Plan over a Guest Pass starts after its booked class, FIX-019); when
 * the server refuses that start, the Plan opens so she chooses another.
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

  const resend = async ({ planId, startsOn }: ResendablePayment) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setBusy(true);
    try {
      const keptStart =
        startsOn !== undefined && startsOn >= boliviaCivilDate(new Date()) ? startsOn : undefined;
      const created = await createPurchaseIntent(
        keptStart === undefined ? { planId } : { planId, startsOn: keptStart },
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
      if (code !== undefined && startRefusals.has(code)) {
        navigation.navigate("PlanDetail", { planId });
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
