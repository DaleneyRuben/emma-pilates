import { sweepEach } from '../../jobs/sweep-each';
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
  // The 09:00 morning the loss is stamped and pushed with.
  occurredAt: Date;
  rules: FounderRules;
  findActive(): Promise<ActiveFounderFacts[]>;
  // Ends the membership, audits it and tells the Client in one transaction;
  // false when it was no longer active.
  markLost(input: {
    id: string;
    accountId: string | null;
    reason: 'gap';
    occurredAt: Date;
  }): Promise<boolean>;
};

// The nightly pass. A Freeze is not a gap; until BKM-012 stores frozen days,
// the gap starts at the Subscription's stored end.
export const endLapsedFounderMemberships = async (
  dependencies: EndLapsedFounderMembershipsDependencies,
): Promise<{ ended: number }> => {
  const active = await dependencies.findActive();
  let ended = 0;

  await sweepEach(
    'founder_memberships',
    active,
    (membership) => membership.id,
    async (membership) => {
      const decision = decideFounderGap({
        today: dependencies.today,
        rules: dependencies.rules,
        membership: { status: 'active', lostAt: null },
        latestRealEnd: membership.latestRealEnd,
        nextStart: membership.nextStart,
      });
      if (!decision.lose) return;
      const lost = await dependencies.markLost({
        id: membership.id,
        accountId: membership.accountId,
        reason: decision.reason,
        occurredAt: dependencies.occurredAt,
      });
      if (lost) ended += 1;
    },
  );

  return { ended };
};
