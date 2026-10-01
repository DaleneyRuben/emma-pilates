import { toPrismaBytes } from '../../database/prisma-bytes';
import {
  AuthenticationThrottleEventKind,
  AuthenticationThrottlePurpose,
  type Prisma,
  type PrismaClient,
} from '../../generated/prisma/client';
import type { EmailSourceBudgetGateway } from './admit-email-request';
import {
  type EmailBudgetGroup,
  emailSourceDayMilliseconds,
} from './email-source-budget-policy';

const purposes: Record<EmailBudgetGroup, AuthenticationThrottlePurpose> = {
  verification: AuthenticationThrottlePurpose.VERIFICATION,
  password_recovery: AuthenticationThrottlePurpose.PASSWORD_RECOVERY,
};

export class PrismaEmailSourceBudgetGateway implements EmailSourceBudgetGateway {
  constructor(private readonly prisma: PrismaClient) {}

  admit(input: Parameters<EmailSourceBudgetGateway['admit']>[0]) {
    const purpose = purposes[input.group];
    const clientDigest =
      input.clientDigest === null ? null : toPrismaBytes(input.clientDigest);
    const networkDigest = toPrismaBytes(input.networkDigest);

    return this.prisma.$transaction(async (transaction) => {
      // Network first, then client: one fixed order, so parallel requests
      // from a source queue up instead of all reading the last free slot.
      await lockSource(transaction, networkDigest);
      if (clientDigest !== null) {
        await lockSource(transaction, clientDigest);
      }

      const read = (where: Prisma.AuthenticationThrottleEventWhereInput) =>
        transaction.authenticationThrottleEvent
          .findMany({
            where: {
              ...where,
              purpose,
              eventKind: AuthenticationThrottleEventKind.EMAIL_REQUESTED,
              deletedAt: null,
              occurredAt: {
                gt: new Date(input.now.getTime() - emailSourceDayMilliseconds),
              },
            },
            select: { occurredAt: true },
          })
          .then((events) => events.map(({ occurredAt }) => occurredAt));
      const [client, network] = await Promise.all([
        clientDigest === null ? null : read({ clientDigest }),
        read({ networkDigest }),
      ]);
      const wait = input.waitSeconds({ client, network });

      if (wait > 0) {
        return wait;
      }

      await transaction.authenticationThrottleEvent.create({
        data: {
          purpose,
          eventKind: AuthenticationThrottleEventKind.EMAIL_REQUESTED,
          clientDigest,
          networkDigest,
          occurredAt: input.now,
          expiresAt: input.expiresAt,
        },
      });

      return 0;
    });
  }
}

const lockSource = (
  transaction: Prisma.TransactionClient,
  digest: Uint8Array<ArrayBuffer>,
) =>
  transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`email-source:${Buffer.from(digest).toString('hex')}`}, 0))`;
