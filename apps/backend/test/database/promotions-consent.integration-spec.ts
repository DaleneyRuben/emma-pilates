import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaPromotionsConsent } from '../../src/booking/promotions-consent/prisma-promotions-consent';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const at = (instant: string) => new Date(instant);

describe('Promotions Consent (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const store = () => createPrismaPromotionsConsent(prisma);
  const lucia = randomUUID();
  const marta = randomUUID();

  const periods = (clientId: string) =>
    prisma.clientPromotionsConsent.findMany({
      where: { clientId },
      orderBy: { consentedAt: 'asc' },
      select: { consentedAt: true, withdrawnAt: true, deletedAt: true },
    });

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    for (const [id, name] of [
      [lucia, 'Lucía Fernández'],
      [marta, 'Marta Rojas'],
    ]) {
      await prisma.client.create({
        data: { id, name, referralCode: `REF-${id.slice(0, 8)}` },
      });
    }
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('gives a consent once and keeps its first time', async () => {
    await expect(store().findOpen(lucia)).resolves.toBeNull();
    await expect(
      store().give({ clientId: lucia, occurredAt: at('2026-10-01T12:00:00Z') }),
    ).resolves.toEqual(at('2026-10-01T12:00:00Z'));
    await expect(
      store().give({ clientId: lucia, occurredAt: at('2026-10-05T12:00:00Z') }),
    ).resolves.toEqual(at('2026-10-01T12:00:00Z'));
    await expect(store().findOpen(lucia)).resolves.toEqual(
      at('2026-10-01T12:00:00Z'),
    );
    await expect(periods(lucia)).resolves.toHaveLength(1);
  });

  it('withdraws the open consent and starts a new period when given again', async () => {
    await store().withdraw({
      clientId: lucia,
      occurredAt: at('2026-10-10T12:00:00Z'),
    });
    await expect(store().findOpen(lucia)).resolves.toBeNull();
    await store().withdraw({
      clientId: lucia,
      occurredAt: at('2026-10-11T12:00:00Z'),
    });
    await store().give({
      clientId: lucia,
      occurredAt: at('2026-10-12T12:00:00Z'),
    });
    await expect(periods(lucia)).resolves.toEqual([
      {
        consentedAt: at('2026-10-01T12:00:00Z'),
        withdrawnAt: at('2026-10-10T12:00:00Z'),
        deletedAt: null,
      },
      {
        consentedAt: at('2026-10-12T12:00:00Z'),
        withdrawnAt: null,
        deletedAt: null,
      },
    ]);
  });

  it('keeps one open consent when two arrive together', async () => {
    const times = ['2026-10-02T12:00:00Z', '2026-10-02T12:00:01Z'];
    const given = await Promise.all(
      times.map((time) =>
        store().give({ clientId: marta, occurredAt: at(time) }),
      ),
    );
    expect(given[0]).toEqual(given[1]);
    await expect(periods(marta)).resolves.toHaveLength(1);
  });

  it('ignores a removed consent', async () => {
    await prisma.clientPromotionsConsent.updateMany({
      where: { clientId: marta },
      data: { deletedAt: at('2026-10-03T12:00:00Z') },
    });
    await expect(store().findOpen(marta)).resolves.toBeNull();
  });
});
