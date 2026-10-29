import type { Prisma } from '../../generated/prisma/client';
import { SubscriptionState } from '../../generated/prisma/client';
import { decideFreezeRequest, type FreezeRequestFacts } from './freeze';
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

export const loadQueuedRenewalStart = (
  transaction: Transaction,
  input: { clientId: string; after: Date },
): Promise<Date | null> =>
  transaction.subscription
    .findFirst({
      where: {
        clientId: input.clientId,
        state: SubscriptionState.ACTIVE,
        startsOn: { gt: input.after },
      },
      orderBy: { startsOn: 'asc' },
      select: { startsOn: true },
    })
    .then((renewal) => renewal?.startsOn ?? null);

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
    existingRequest:
      input.subscription.freezes[0] === undefined
        ? null
        : (input.subscription.freezes[0].state.toLowerCase() as
            'requested' | 'approved' | 'refused'),
    subscriptionStartsOn: input.subscription.startsOn,
    renewalStartsOn,
  };
  const decision = decideFreezeRequest(facts);
  if (!decision.allowed) {
    throw new PaymentRuleError(
      decision.code,
      'Este plan no se puede congelar.',
    );
  }
  return { frozenDays: decision.frozenDays };
};
