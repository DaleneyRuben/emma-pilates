import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../../src/generated/prisma/client';
import { ImageMediaType } from '../../src/generated/prisma/enums';
import { createCatalogRepository } from '../../src/booking/catalog/prisma-catalog-repository';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

describe('Booking catalog repository', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const withRollback = async (
    work: (tx: Prisma.TransactionClient) => Promise<void>,
  ): Promise<void> => {
    const rollback = new Error('test rollback');
    try {
      await prisma.$transaction(async (tx) => {
        await work(tx);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  };

  it('returns empty results without inventing catalog data', async () => {
    await withRollback(async (tx) => {
      const repository = createCatalogRepository(tx);
      expect(await repository.listVisiblePlans()).toEqual([]);
      expect(await repository.findClassType(randomUUID())).toBeNull();
      expect(await repository.findSessionSchedule(randomUUID())).toBeNull();
      expect(
        await repository.findActiveSubscription(
          randomUUID(),
          new Date('2026-09-01'),
        ),
      ).toBeNull();
      expect(
        await repository.listPublishedPromotions(new Date('2026-09-01')),
      ).toEqual([]);
      expect(
        await repository.listScheduledSessions({
          branchId: randomUUID(),
          from: new Date('2026-09-01'),
          until: new Date('2026-09-02'),
          limit: 20,
        }),
      ).toEqual([]);
    });
  });

  it('lists only visible Plans in display order with stable ties and exact centavos', async () => {
    await withRollback(async (tx) => {
      const ids = [randomUUID(), randomUUID()].sort();
      const plan = {
        durationDays: 30,
        weeklyClassCap: null,
        classAllowance: 8,
        priceCentavos: 15050,
        displayOrder: 1,
      };
      await tx.plan.createMany({
        data: [
          { ...plan, id: ids[1], name: 'Second' },
          { ...plan, id: ids[0], name: 'First' },
          { ...plan, name: 'Hidden', hiddenAt: new Date(), displayOrder: 0 },
        ],
      });
      expect(await createCatalogRepository(tx).listVisiblePlans()).toEqual(
        ids.map((id, index) => ({
          ...plan,
          id,
          name: index === 0 ? 'First' : 'Second',
        })),
      );
    });
  });

  it('retains Class Type detail after archival for existing Session references', async () => {
    await withRollback(async (tx) => {
      const data = {
        id: randomUUID(),
        name: 'Reformer',
        description: 'Pilates con Reformer',
        defaultCapacity: 8,
        equipmentNeeds: 'Reformer',
      };
      await tx.classType.create({ data: { ...data, archivedAt: new Date() } });
      expect(await createCatalogRepository(tx).findClassType(data.id)).toEqual(
        data,
      );
    });
  });

  it('round trips weekly schedule dates and wall-clock time without a device-zone conversion', async () => {
    await withRollback(async (tx) => {
      const references = await createSessionReferences(tx);
      const data = {
        id: randomUUID(),
        ...references,
        weekday: 1,
        startsAtLocal: new Date('1970-01-01T09:00:00Z'),
        durationMinutes: 60,
        capacity: 8,
        effectiveFrom: new Date('2026-09-01'),
        effectiveUntil: new Date('2026-10-01'),
      };
      await tx.sessionSchedule.create({ data });
      expect(
        await createCatalogRepository(tx).findSessionSchedule(data.id),
      ).toEqual(data);
    });
  });

  it('lists scheduled Sessions by Branch in a half-open range with a bounded result', async () => {
    await withRollback(async (tx) => {
      const references = await createSessionReferences(tx);
      const ids: string[] = [];
      for (const hour of [12, 13, 14, 15]) {
        const row = await tx.session.create({
          data: {
            ...references,
            startsAt: new Date(`2026-09-14T${hour}:00:00Z`),
            endsAt: new Date(`2026-09-14T${hour + 1}:00:00Z`),
            capacity: 8,
          },
        });
        ids.push(row.id);
      }
      await tx.session.update({
        where: { id: ids[2] },
        data: {
          state: 'CANCELLED',
          cancellationCause: 'ZERO_BOOKINGS',
          cancelledAt: new Date(),
        },
      });
      const other = await createSessionReferences(tx);
      await tx.session.create({
        data: {
          ...other,
          startsAt: new Date('2026-09-14T13:00:00Z'),
          endsAt: new Date('2026-09-14T14:00:00Z'),
          capacity: 8,
        },
      });
      const input = {
        branchId: references.branchId,
        from: new Date('2026-09-14T13:00:00Z'),
        until: new Date('2026-09-14T15:00:00Z'),
        limit: 20,
      };
      const repository = createCatalogRepository(tx);
      expect(await repository.listScheduledSessions(input)).toEqual([
        {
          id: ids[1],
          ...references,
          startsAt: input.from,
          endsAt: new Date('2026-09-14T14:00:00Z'),
          capacity: 8,
        },
      ]);
      expect(
        (
          await repository.listScheduledSessions({
            ...input,
            from: new Date('2026-09-14T12:00:00Z'),
            limit: 1,
          })
        ).map((row) => row.id),
      ).toEqual([ids[0]]);
    });
  });

  it('reads only the requested Client active Subscription on inclusive paid dates using its snapshot', async () => {
    await withRollback(async (tx) => {
      const client = await tx.client.create({
        data: { name: 'Ana', referralCode: randomUUID() },
      });
      const plan = await tx.plan.create({
        data: {
          name: 'Renamed hidden Plan',
          durationDays: 90,
          classAllowance: 24,
          priceCentavos: 90000,
          displayOrder: 0,
          hiddenAt: new Date(),
        },
      });
      const data = {
        id: randomUUID(),
        planId: plan.id,
        planNameSnapshot: 'Original Plan',
        durationDaysSnapshot: 30,
        originalClassAllowance: 8,
        remainingClassAllowance: 0,
        startsOn: new Date('2026-01-31'),
        endsOn: new Date('2026-02-28'),
      };
      await tx.subscription.create({
        data: {
          ...data,
          clientId: client.id,
          activatedAt: new Date('2026-01-31T16:00:00Z'),
        },
      });
      const repository = createCatalogRepository(tx);
      expect(
        await repository.findActiveSubscription(client.id, data.startsOn),
      ).toEqual(data);
      expect(
        await repository.findActiveSubscription(client.id, data.endsOn),
      ).toEqual(data);
      expect(
        await repository.findActiveSubscription(
          client.id,
          new Date('2026-03-01'),
        ),
      ).toBeNull();
      expect(
        await repository.findActiveSubscription(
          client.id,
          new Date('2026-01-30'),
        ),
      ).toBeNull();
      expect(
        await repository.findActiveSubscription(randomUUID(), data.startsOn),
      ).toBeNull();
      await tx.subscription.update({
        where: { id: data.id },
        data: { state: 'EXPIRED', expiredAt: new Date() },
      });
      expect(
        await repository.findActiveSubscription(client.id, data.startsOn),
      ).toBeNull();
    });
  });

  it('reads published Promotion metadata only inside its inclusive display dates', async () => {
    await withRollback(async (tx) => {
      const client = await tx.client.create({
        data: { name: 'Test', referralCode: randomUUID() },
      });
      const account = await tx.account.create({
        data: { email: `${randomUUID()}@example.com`, clientId: client.id },
      });
      const image = await tx.imageAsset.create({
        data: {
          ownerAccountId: account.id,
          purpose: 'PROMOTION',
          pendingObjectKey: randomUUID(),
          declaredMediaType: ImageMediaType.JPEG,
          declaredByteSize: 100,
          declaredChecksum: Buffer.alloc(32, 'test'),
          // Stamped explicitly: the upload must still be alive when created.
          createdAt: new Date('2026-08-31T14:00:00.000Z'),
          expiresAt: new Date('2026-10-01'),
        },
      });
      const dates = {
        displayStartsOn: new Date('2026-09-01'),
        displayEndsOn: new Date('2026-09-30'),
      };
      const data = {
        id: randomUUID(),
        headline: 'Conoce el estudio',
        description: 'Te esperamos',
        imageAssetId: image.id,
        displayOrder: 0,
      };
      await tx.promotion.create({
        data: { ...data, ...dates, publishedAt: new Date('2026-08-31') },
      });
      await tx.promotion.create({
        data: { ...data, id: randomUUID(), ...dates, publishedAt: null },
      });
      await tx.promotion.create({
        data: { ...data, id: randomUUID(), ...dates, archivedAt: new Date() },
      });
      const repository = createCatalogRepository(tx);
      expect(
        await repository.listPublishedPromotions(dates.displayStartsOn),
      ).toEqual([data]);
      expect(
        await repository.listPublishedPromotions(dates.displayEndsOn),
      ).toEqual([data]);
      expect(
        await repository.listPublishedPromotions(new Date('2026-08-31')),
      ).toEqual([]);
      expect(
        await repository.listPublishedPromotions(new Date('2026-10-01')),
      ).toEqual([]);
    });
  });
});

async function createSessionReferences(tx: Prisma.TransactionClient) {
  const branch = await tx.branch.create({
    data: { name: randomUUID(), address: 'Test' },
  });
  const trainer = await tx.staffMember.create({
    data: {
      name: 'Trainer',
      role: 'TRAINER',
      branchAssignments: { create: { branchId: branch.id } },
    },
  });
  const classType = await tx.classType.create({
    data: {
      name: randomUUID(),
      description: 'Pilates',
      durationMinutes: 60,
      defaultCapacity: 8,
    },
  });
  return {
    branchId: branch.id,
    trainerStaffMemberId: trainer.id,
    classTypeId: classType.id,
  };
}
