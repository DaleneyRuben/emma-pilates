import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';

export type ClientSubscriptionSummary = {
  id: string;
  planName: string;
  originalClassAllowance: number;
  remainingClassAllowance: number;
  startsOn: Date;
  endsOn: Date;
};

export type ClientSubscriptionStatus =
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'none';

export type ClientSubscriptionView = {
  status: ClientSubscriptionStatus;
  subscription: ClientSubscriptionSummary | null;
};

type LoadClientSubscriptionDependencies = {
  principal: AuthenticatedPrincipal;
  today: Date;
  findActiveSubscription(
    clientId: string,
    onDate: Date,
  ): Promise<ClientSubscriptionSummary | null>;
  findLatestSubscription(
    clientId: string,
  ): Promise<ClientSubscriptionSummary | null>;
};

// The renewal reminder is sent 3 days before the paid-through date.
const renewalReminderDays = 3;
const dayMilliseconds = 24 * 60 * 60 * 1_000;

export const loadClientSubscription = async (
  dependencies: LoadClientSubscriptionDependencies,
): Promise<ClientSubscriptionView> => {
  if (dependencies.principal.identity.kind !== 'client') {
    throw new BookingAccessDeniedError();
  }

  const { clientId } = dependencies.principal.identity;
  const active = await dependencies.findActiveSubscription(
    clientId,
    dependencies.today,
  );

  if (active !== null) {
    const daysLeft =
      (active.endsOn.getTime() - dependencies.today.getTime()) /
      dayMilliseconds;

    return {
      status: daysLeft <= renewalReminderDays ? 'expiring_soon' : 'active',
      subscription: active,
    };
  }

  const latest = await dependencies.findLatestSubscription(clientId);

  return latest === null
    ? { status: 'none', subscription: null }
    : { status: 'expired', subscription: latest };
};
