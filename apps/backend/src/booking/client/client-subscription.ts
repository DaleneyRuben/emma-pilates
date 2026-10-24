import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { SubscriptionSummary } from '../catalog/catalog-repository';
import { BookingAccessDeniedError } from '../commands/create-booking';

export type ClientSubscriptionSummary = {
  id: string;
  planName: string;
  originalClassAllowance: number;
  remainingClassAllowance: number;
  startsOn: Date;
  endsOn: Date;
  /** «Clases extra: 1 · Regalo de bienvenida», or null when none remain. */
  extraClassesLine: string | null;
};

export const toSubscriptionSummary = (
  subscription: SubscriptionSummary | null,
): ClientSubscriptionSummary | null =>
  subscription === null
    ? null
    : {
        id: subscription.id,
        planName: subscription.planNameSnapshot,
        originalClassAllowance: subscription.originalClassAllowance,
        remainingClassAllowance: subscription.remainingClassAllowance,
        startsOn: subscription.startsOn,
        endsOn: subscription.endsOn,
        extraClassesLine: subscription.extraClassesLine,
      };

export type ClientSubscriptionStatus =
  'active' | 'expiring_soon' | 'expired' | 'none';

export type ClientSubscriptionView = {
  status: ClientSubscriptionStatus;
  subscription: ClientSubscriptionSummary | null;
  nextSubscription: ClientSubscriptionSummary | null;
  founderRenewalDeadline: string | null;
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
  findFutureSubscription(
    clientId: string,
    after: Date,
  ): Promise<ClientSubscriptionSummary | null>;
  readFounderRenewal?(clientId: string): Promise<{ gapDays: number } | null>;
};

// The renewal reminder is sent 3 days before the paid-through date.
const renewalReminderDays = 3;
const dayMilliseconds = 24 * 60 * 60 * 1_000;

type SubscriptionLookup = {
  today: Date;
  findActiveSubscription(
    clientId: string,
    onDate: Date,
  ): Promise<ClientSubscriptionSummary | null>;
  findLatestSubscription(
    clientId: string,
  ): Promise<ClientSubscriptionSummary | null>;
  findFutureSubscription(
    clientId: string,
    after: Date,
  ): Promise<ClientSubscriptionSummary | null>;
  readFounderRenewal?(clientId: string): Promise<{ gapDays: number } | null>;
};

const renewalDeadline = async (
  clientId: string,
  realEnd: Date,
  dependencies: SubscriptionLookup,
): Promise<string | null> => {
  const founder = await dependencies.readFounderRenewal?.(clientId);
  if (founder == null) return null;
  return new Date(realEnd.getTime() + founder.gapDays * dayMilliseconds)
    .toISOString()
    .slice(0, 10);
};

export const describeSubscription = async (
  clientId: string,
  dependencies: SubscriptionLookup,
): Promise<ClientSubscriptionView> => {
  const active = await dependencies.findActiveSubscription(
    clientId,
    dependencies.today,
  );

  if (active !== null) {
    const daysLeft =
      (active.endsOn.getTime() - dependencies.today.getTime()) /
      dayMilliseconds;

    const next = await dependencies.findFutureSubscription(
      clientId,
      dependencies.today,
    );
    return {
      status: daysLeft <= renewalReminderDays ? 'expiring_soon' : 'active',
      subscription: active,
      nextSubscription: next,
      founderRenewalDeadline: await renewalDeadline(
        clientId,
        active.endsOn,
        dependencies,
      ),
    };
  }

  const latest = await dependencies.findLatestSubscription(clientId);

  return latest === null
    ? {
        status: 'none',
        subscription: null,
        nextSubscription: null,
        founderRenewalDeadline: null,
      }
    : {
        status: 'expired',
        subscription: latest,
        nextSubscription: null,
        founderRenewalDeadline: null,
      };
};

export const loadClientSubscription = async (
  dependencies: LoadClientSubscriptionDependencies,
): Promise<ClientSubscriptionView> => {
  if (dependencies.principal.identity.kind !== 'client') {
    throw new BookingAccessDeniedError();
  }

  return describeSubscription(
    dependencies.principal.identity.clientId,
    dependencies,
  );
};
