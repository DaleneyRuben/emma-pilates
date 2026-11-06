import type { Prisma } from '../../generated/prisma/client';
import { PaymentState, SubscriptionState } from '../../generated/prisma/client';
import {
  countedFreezeRequest,
  decideFreezeRequest,
  type FreezeRequestFacts,
} from './freeze';
import { isCivilDate } from './freeze.dto';
import { PaymentRuleError } from './payment-errors';

type Transaction = Prisma.TransactionClient;

export const parseFreezeCivilDate = (value: string): Date => {
  if (!isCivilDate(value)) {
    throw new PaymentRuleError(
      'invalid_civil_date',
      'La fecha no es un día del calendario.',
    );
  }
  return new Date(`${value}T00:00:00.000Z`);
};

// The earliest start queued after the current end: a future Subscription, or
// a transfer still in review for one (booking ADR-0013), which the Freeze
// must not reach either or it could never be confirmed.
export const loadQueuedRenewalStart = async (
  transaction: Transaction,
  input: { clientId: string; after: Date },
): Promise<Date | null> => {
  const [renewal, pending] = await Promise.all([
    transaction.subscription.findFirst({
      where: {
        clientId: input.clientId,
        state: SubscriptionState.ACTIVE,
        startsOn: { gt: input.after },
      },
      orderBy: { startsOn: 'asc' },
      select: { startsOn: true },
    }),
    transaction.payment.findFirst({
      where: {
        clientId: input.clientId,
        state: PaymentState.PENDING,
        startsOn: { gt: input.after },
      },
      orderBy: { startsOn: 'asc' },
      select: { startsOn: true },
    }),
  ]);
  const starts = [renewal?.startsOn, pending?.startsOn].filter(
    (start): start is Date => start !== undefined,
  );
  return starts.length === 0
    ? null
    : new Date(Math.min(...starts.map((start) => start.getTime())));
};

export const assertFreezeRequestAllowed = async (
  transaction: Transaction,
  input: {
    subscription: {
      id: string;
      clientId: string;
      startsOn: Date;
      endsOn: Date;
      durationDaysSnapshot: number;
      freezes: { state: string }[];
    };
    startsOn: string;
    endsOn: string;
    today: Date;
  },
): Promise<{ frozenDays: number }> => {
  const renewalStartsOn = await loadQueuedRenewalStart(transaction, {
    clientId: input.subscription.clientId,
    after: input.subscription.endsOn,
  });
  const facts: FreezeRequestFacts = {
    subscriptionId: input.subscription.id,
    clientId: input.subscription.clientId,
    durationDays: input.subscription.durationDaysSnapshot,
    endsOn: input.subscription.endsOn,
    today: input.today,
    startsOn: parseFreezeCivilDate(input.startsOn),
    endsOnRequest: parseFreezeCivilDate(input.endsOn),
    existingRequest: countedFreezeRequest(input.subscription.freezes),
    subscriptionStartsOn: input.subscription.startsOn,
    renewalStartsOn,
  };
  const decision = decideFreezeRequest(facts);
  if (!decision.allowed) {
    // ADR-0016: the request path answers one code. An installed build that
    // still knows the finer codes keeps working, and the approval path
    // still sends them.
    throw new PaymentRuleError(
      'freeze_not_allowed',
      'Este plan no se puede congelar.',
    );
  }
  return { frozenDays: decision.frozenDays };
};
