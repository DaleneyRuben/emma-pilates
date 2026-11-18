import type { ClientOverviewDto } from "@pilates/api-contracts";

type SubscriptionView = ClientOverviewDto["subscription"];

/**
 * The classes she can still book: the plan's own plus the live extra ones,
 * which the backend spends once the plan's run out (booking ADR-0013).
 */
export function bookableClasses(
  subscription: SubscriptionView["subscription"] | null | undefined,
): number {
  if (subscription === null || subscription === undefined) return 0;
  return subscription.remainingClassAllowance + (subscription.extraClasses ?? 0);
}

/** An active (or about to end) Plan with something left to book. */
export function canBookFor(view: SubscriptionView | null | undefined): boolean {
  if (view === null || view === undefined) return false;
  const active = view.status === "active" || view.status === "expiring_soon";
  return active && bookableClasses(view.subscription) > 0;
}
