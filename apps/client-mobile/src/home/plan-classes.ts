import type { ClientSubscriptionSummaryDto } from "@pilates/api-contracts";

/**
 * Walkthrough n.º 61: live extra classes (a gift, an invitation, a courtesy)
 * count with the Plan's own, and the card says where they come from.
 */
export function planClasses(
  subscription: Pick<ClientSubscriptionSummaryDto, "remainingClassAllowance" | "extraClasses">,
): { left: number; breakdown: string | null } {
  const own = subscription.remainingClassAllowance;
  const extra = subscription.extraClasses ?? 0;
  return extra > 0
    ? { left: own + extra, breakdown: `${own} del plan + ${extra} de regalo` }
    : { left: own, breakdown: null };
}
