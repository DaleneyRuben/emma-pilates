import {
  AuthenticationThrottleEventKind,
  AuthenticationThrottlePurpose,
  type PrismaClient,
} from '../../generated/prisma/client';
import type { StaffEmailBudgetGateway } from './admit-staff-email-request';
import {
  type StaffEmailPurpose,
  staffEmailDayMilliseconds,
} from './staff-email-budget-policy';

const purposes: Record<StaffEmailPurpose, AuthenticationThrottlePurpose> = {
  activation: AuthenticationThrottlePurpose.ACTIVATION,
  verification: AuthenticationThrottlePurpose.VERIFICATION,
};

export class PrismaStaffEmailBudgetGateway implements StaffEmailBudgetGateway {
  constructor(private readonly prisma: PrismaClient) {}

  admit(input: Parameters<StaffEmailBudgetGateway['admit']>[0]) {
    return this.prisma.$transaction(async (transaction) => {
      // Parallel requests from one Account queue up instead of all reading
      // the last free slot.
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`staff-email:${input.accountId}`}, 0))`;

      const events = await transaction.authenticationThrottleEvent.findMany({
        where: {
          accountId: input.accountId,
          eventKind: AuthenticationThrottleEventKind.STAFF_EMAIL_REQUESTED,
          deletedAt: null,
          occurredAt: {
            gt: new Date(input.now.getTime() - staffEmailDayMilliseconds),
          },
        },
        select: { occurredAt: true },
      });
      const wait = input.waitSeconds(
        events.map(({ occurredAt }) => occurredAt),
      );

      if (wait > 0) {
        return wait;
      }

      await transaction.authenticationThrottleEvent.create({
        data: {
          purpose: purposes[input.purpose],
          eventKind: AuthenticationThrottleEventKind.STAFF_EMAIL_REQUESTED,
          accountId: input.accountId,
          occurredAt: input.now,
          expiresAt: input.expiresAt,
        },
      });

      return 0;
    });
  }
}
