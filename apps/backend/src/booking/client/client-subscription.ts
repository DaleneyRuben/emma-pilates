import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import type { SubscriptionSummary } from '../catalog/catalog-repository';
import { BookingAccessDeniedError } from '../commands/create-booking';
import { nameInitials } from './name-initials';

export type ClientSubscriptionSummary = {
  id: string;
  planName: string;
  originalClassAllowance: number;
  remainingClassAllowance: number;
  startsOn: Date;
  endsOn: Date;
  /** «Clases extra: 1 · Regalo de bienvenida», or null when none remain. */
  extraClassesLine: string | null;
  /** Classes left this week. Null when the Plan has no cap. */
  classesLeftThisWeek?: number | null;
  /** Live extra classes on top of the allowance (walkthrough n.º 61). */
  extraClasses?: number;
  /** Set on a Guest Pass (walkthrough n.º 56); its class, once used, and its host (n.º 19). */
  guestPass?: { usedClassStartsAt: Date | null; hostName?: string } | null;
};

const firstName = (name: string): string => name.trim().split(/\s+/)[0] ?? '';

// The transport shape of a Guest Pass: absent on a Plan.
export const guestPassField = (
  guestPass: ClientSubscriptionSummary['guestPass'],
): {
  guestPass?: {
    usedClassStartsAt: string | null;
    hostFirstName?: string;
    hostInitials?: string;
  };
} =>
  guestPass == null
    ? {}
    : {
        guestPass: {
          usedClassStartsAt: guestPass.usedClassStartsAt?.toISOString() ?? null,
          ...(guestPass.hostName === undefined
            ? {}
            : {
                hostFirstName: firstName(guestPass.hostName),
                hostInitials: nameInitials(guestPass.hostName),
              }),
        },
      };

const civil = (date: Date): string => date.toISOString().slice(0, 10);

// One Subscription summary in its transport shape: civil dates, and the Guest
// Pass only when it is one.
export const toSubscriptionSummaryTransport = ({
  guestPass,
  ...summary
}: ClientSubscriptionSummary) => ({
  ...summary,
  startsOn: civil(summary.startsOn),
  endsOn: civil(summary.endsOn),
  ...guestPassField(guestPass),
});

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
        extraClasses: subscription.extraClasses,
      };

export type ClientSubscriptionStatus =
  'active' | 'expiring_soon' | 'expired' | 'none';

export type ClientFreezeSummary = {
  id: string;
  state: 'requested' | 'approved' | 'refused' | 'withdrawn';
  startsOn: string;
  endsOn: string;
};

export type ClientSubscriptionView = {
  status: ClientSubscriptionStatus;
  subscription: ClientSubscriptionSummary | null;
  nextSubscription: ClientSubscriptionSummary | null;
  founderRenewalDeadline: string | null;
  freeze: ClientFreezeSummary | null;
  canRequestFreeze: boolean;
  /** Set while a Plan bought now starts after the current one, unchosen. */
  renewalStartsOn?: string;
  /**
   * The start of a next plan already queued (bought, or a transfer in
   * review). A Freeze must end the current plan before it (finding 51).
   */
  queuedPlanStartsOn?: string;
  /** With no Plan: her friend's code gave her no free class (n.º 22, C02j). */
  inactiveInvite?: { hostFirstName: string };
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
  readFreeze?(subscriptionId: string): Promise<ClientFreezeSummary | null>;
  readPlanDurationDays?(subscriptionId: string): Promise<number | null>;
  readRenewalStartsOn?(clientId: string): Promise<string | null>;
  readQueuedPlanStart?(clientId: string, after: Date): Promise<string | null>;
  readInactiveInvite?(
    clientId: string,
  ): Promise<{ hostFirstName: string } | null>;
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
  readFreeze?(subscriptionId: string): Promise<ClientFreezeSummary | null>;
  readPlanDurationDays?(subscriptionId: string): Promise<number | null>;
  readRenewalStartsOn?(clientId: string): Promise<string | null>;
  readQueuedPlanStart?(clientId: string, after: Date): Promise<string | null>;
  readInactiveInvite?(
    clientId: string,
  ): Promise<{ hostFirstName: string } | null>;
};

const renewalDeadline = async (
  clientId: string,
  realEnd: Date,
  dependencies: SubscriptionLookup,
): Promise<string | null> => {
  const founder = await dependencies.readFounderRenewal?.(clientId);
  if (founder == null) return null;
  return new Date(realEnd.getTime() + (founder.gapDays + 1) * dayMilliseconds)
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
    const freeze = (await dependencies.readFreeze?.(active.id)) ?? null;
    const durationDays =
      (await dependencies.readPlanDurationDays?.(active.id)) ?? 0;
    const renewalStartsOn =
      (await dependencies.readRenewalStartsOn?.(clientId)) ?? null;
    const queuedPlanStartsOn =
      (await dependencies.readQueuedPlanStart?.(clientId, active.endsOn)) ??
      null;
    return {
      status: daysLeft <= renewalReminderDays ? 'expiring_soon' : 'active',
      subscription: active,
      nextSubscription: next,
      founderRenewalDeadline: await renewalDeadline(
        clientId,
        active.endsOn,
        dependencies,
      ),
      freeze,
      // booking ADR-0010: a refused or withdrawn Freeze does not count; she
      // may ask again.
      canRequestFreeze:
        durationDays >= 90 &&
        (freeze === null ||
          freeze.state === 'refused' ||
          freeze.state === 'withdrawn'),
      ...(renewalStartsOn === null ? {} : { renewalStartsOn }),
      ...(queuedPlanStartsOn === null ? {} : { queuedPlanStartsOn }),
    };
  }

  const latest = await dependencies.findLatestSubscription(clientId);
  const inactiveInvite =
    latest === null
      ? ((await dependencies.readInactiveInvite?.(clientId)) ?? null)
      : null;

  return latest === null
    ? {
        status: 'none',
        subscription: null,
        nextSubscription: null,
        founderRenewalDeadline: null,
        freeze: null,
        canRequestFreeze: false,
        ...(inactiveInvite === null ? {} : { inactiveInvite }),
      }
    : {
        status: 'expired',
        subscription: latest,
        nextSubscription: null,
        founderRenewalDeadline: null,
        freeze: null,
        canRequestFreeze: false,
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
