import type { NewNotification } from '../../notifications/prisma-notification-store';
import { decideFounderGap, type FounderRules } from './founder-membership';

export type ActiveFounderFacts = {
  id: string;
  clientId: string;
  accountId: string | null;
  number: number;
  latestRealEnd: Date | null;
  nextStart: Date | null;
};

type EndLapsedFounderMembershipsDependencies = {
  today: Date;
  rules: FounderRules;
  findActive(): Promise<ActiveFounderFacts[]>;
  markLost(input: {
    id: string;
    accountId: string | null;
    reason: 'gap';
    occurredAt: Date;
  }): Promise<void>;
  record(notification: NewNotification): Promise<void>;
};

const lossMessage = (gapDays: number): string =>
  `Pasaron más de ${gapDays} días sin plan, así que tu membresía fundadora se perdió.`;

// The nightly pass. A Freeze is not a gap; until BKM-012 stores frozen days,
// the gap starts at the Subscription's stored end.
export const endLapsedFounderMemberships = async (
  dependencies: EndLapsedFounderMembershipsDependencies,
): Promise<{ ended: number }> => {
  const active = await dependencies.findActive();
  let ended = 0;

  for (const membership of active) {
    const decision = decideFounderGap({
      today: dependencies.today,
      rules: dependencies.rules,
      membership: { status: 'active', lostAt: null },
      latestRealEnd: membership.latestRealEnd,
      nextStart: membership.nextStart,
    });
    if (!decision.lose) continue;

    try {
      await dependencies.markLost({
        id: membership.id,
        accountId: membership.accountId,
        reason: decision.reason,
        occurredAt: dependencies.today,
      });
    } catch {
      continue;
    }
    if (membership.accountId !== null) {
      await dependencies.record({
        accountId: membership.accountId,
        category: 'reminder',
        type: 'founder_membership_lost',
        businessEventKey: `founder-membership-lost:${membership.id}`,
        title: 'Membresía fundadora',
        message: lossMessage(dependencies.rules.founderGapDays),
        destination: { type: 'subscription', id: null },
        occurredAt: dependencies.today,
      });
    }
    ended += 1;
  }

  return { ended };
};
