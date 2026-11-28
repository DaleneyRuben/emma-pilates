import type { ClientSubscriptionDto, ClientSubscriptionSummaryDto } from "@pilates/api-contracts";

type SubscriptionView = Pick<ClientSubscriptionDto, "subscription" | "nextSubscription">;

/**
 * The Subscription a Booking consumed, which is not always the one in force
 * today: a Plan bought over a Guest Pass starts after its class (FIX-019) and
 * covers the classes from then on. Owner's iPhone, 2026-11-28: each of those
 * bookings confirmed «Usaste tu clase gratis». Without the API's id (a server
 * older than 1.3.1), the one in force today, as before. Null when neither
 * Subscription she holds is the one named.
 */
export function bookedSubscription(
  view: SubscriptionView | null,
  subscriptionId: string | undefined,
): ClientSubscriptionSummaryDto | null {
  if (view === null) return null;
  if (subscriptionId === undefined) return view.subscription ?? null;
  return (
    [view.subscription, view.nextSubscription].find(
      (subscription) => subscription?.id === subscriptionId,
    ) ?? null
  );
}

export function isGuestPass(subscription: ClientSubscriptionSummaryDto | null): boolean {
  return (
    subscription !== null &&
    (subscription.guestPass !== undefined || subscription.planName === "Pase de invitada")
  );
}
