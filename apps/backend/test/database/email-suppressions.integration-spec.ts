import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { toPrismaBytes } from '../../src/database/prisma-bytes';
import { createPrismaEmailSuppressions } from '../../src/system-identity/email-suppression/prisma-email-suppressions';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const digestEmail = (email: string) => Buffer.from(`digest:${email}`);
const occurredAt = new Date('2026-10-19T15:00:00.000Z');

// ADR-0094 on real PostgreSQL: Resend's events become suppressions once,
// keyed by the address digest, and a resolved one no longer suppresses.
describe('email suppressions (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  let suppressions: ReturnType<typeof createPrismaEmailSuppressions>;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    suppressions = createPrismaEmailSuppressions(prisma, digestEmail);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('records a suppression by digest only once per provider event', async () => {
    const bounce = {
      email: 'bounced@example.com',
      reason: 'HARD_BOUNCE' as const,
      providerEventId: 'msg_bounce',
      providerOccurredAt: occurredAt,
    };

    await suppressions.record([bounce]);
    await suppressions.record([bounce]);

    const rows = await prisma.emailSuppression.findMany({
      where: { providerEventId: 'msg_bounce' },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      provider: 'resend',
      reason: 'HARD_BOUNCE',
      providerOccurredAt: occurredAt,
      resolvedAt: null,
    });
    expect(Buffer.from(rows[0].emailDigest)).toEqual(
      digestEmail('bounced@example.com'),
    );
    await expect(
      suppressions.isSuppressed('bounced@example.com'),
    ).resolves.toBe(true);
  });

  it('suppresses nobody else, and no longer once resolved', async () => {
    await suppressions.record([
      {
        email: 'complained@example.com',
        reason: 'COMPLAINT',
        providerEventId: 'msg_complaint',
        providerOccurredAt: occurredAt,
      },
    ]);
    await expect(suppressions.isSuppressed('other@example.com')).resolves.toBe(
      false,
    );

    await prisma.emailSuppression.updateMany({
      where: {
        emailDigest: toPrismaBytes(digestEmail('complained@example.com')),
      },
      data: { resolvedAt: new Date(), resolutionReason: 'address_corrected' },
    });

    await expect(
      suppressions.isSuppressed('complained@example.com'),
    ).resolves.toBe(false);
  });
});
