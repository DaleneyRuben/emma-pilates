import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdministratorClients } from '../../src/booking/clients/prisma-administrator-clients';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');
// 11:00 on 21 September in Bolivia.
const now = new Date('2026-09-21T15:00:00.000Z');

// FIX-091 (W8 A): Clientas' «Por vencer» chip lists the active Plans ending
// within the 3 days of her own renewal reminder, and «Sin reservar» the
// Clients with an active Plan and no class ahead; each chip says how many.
describe('Administrator Client directory «Por vencer» and «Sin reservar» (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const directory = () => createPrismaAdministratorClients(prisma);

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    const plan = await prisma.plan.create({
      data: {
        name: 'Mensual 8 clases',
        durationDays: 30,
        classAllowance: 8,
        priceCentavos: 50_000,
        displayOrder: 1,
      },
    });
    const classType = await prisma.classType.create({
      data: {
        name: randomUUID(),
        description: 'Clase',
        durationMinutes: 60,
        defaultCapacity: 8,
      },
    });
    const client = async (
      name: string,
      endsOn: string | null,
      classes: { startsAt: string; cancelled?: true }[] = [],
    ) => {
      const created = await prisma.client.create({
        data: {
          name,
          referralCode: `REF-${randomUUID().slice(0, 8)}`,
          account: {
            create: {
              email: `${randomUUID()}@example.com`,
              activatedAt: new Date('2026-01-01T12:00:00.000Z'),
            },
          },
        },
        select: { id: true, account: { select: { id: true } } },
      });
      if (endsOn === null) return;
      const ends = new Date(endsOn);
      const subscription = await prisma.subscription.create({
        data: {
          clientId: created.id,
          planId: plan.id,
          planNameSnapshot: 'Mensual 8 clases',
          durationDaysSnapshot: 30,
          originalClassAllowance: 8,
          remainingClassAllowance: 4,
          startsOn: new Date(ends.getTime() - 29 * 24 * 60 * 60 * 1_000),
          endsOn: ends,
          activatedAt: new Date('2026-08-01T12:00:00.000Z'),
        },
      });
      for (const shape of classes) {
        const startsAt = new Date(shape.startsAt);
        // Its own Branch and Trainer: neither may hold two classes at once.
        const trainer = await prisma.staffMember.create({
          data: { name: 'Carla Rojas', role: 'TRAINER' },
        });
        const branch = await prisma.branch.create({
          data: { name: randomUUID(), address: 'Calle Uno' },
        });
        const session = await prisma.session.create({
          data: {
            branchId: branch.id,
            classTypeId: classType.id,
            trainerStaffMemberId: trainer.id,
            startsAt,
            endsAt: new Date(startsAt.getTime() + 60 * 60 * 1_000),
            capacity: 8,
          },
        });
        await prisma.booking.create({
          data: {
            sessionId: session.id,
            clientId: created.id,
            subscriptionId: subscription.id,
            createdByAccountId: created.account!.id,
            ...(shape.cancelled
              ? {
                  state: 'CANCELLED',
                  cancelledAt: new Date('2027-01-01T00:00:00.000Z'),
                  cancelledByAccountId: created.account!.id,
                  cancellationCause: 'CLIENT_REQUEST',
                }
              : {}),
          },
        });
      }
    };

    // Ends in 2 days with a class ahead: «Por vencer» only.
    await client('Ana Vence', '2026-09-23', [
      { startsAt: '2026-09-22T12:00:00.000Z' },
    ]);
    // Ends in 3 days and nothing booked: both chips.
    await client('Berta Vence', '2026-09-24');
    // Ends in 4 days; her only class ahead was cancelled: «Sin reservar».
    await client('Carmen Libre', '2026-09-25', [
      { startsAt: '2026-09-22T12:00:00.000Z', cancelled: true },
    ]);
    // Her only class already happened this morning: «Sin reservar».
    await client('Diana Pasada', '2026-10-10', [
      { startsAt: '2026-09-21T12:00:00.000Z' },
    ]);
    // A class later today: neither.
    await client('Elena Reservada', '2026-10-10', [
      { startsAt: '2026-09-21T20:00:00.000Z' },
    ]);
    // An ended Plan, and no Plan at all: neither.
    await client('Flor Vencida', '2026-09-20');
    await client('Gina Nueva', null);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const list = (filter?: 'expiring' | 'unbooked') =>
    directory().list({
      page: 1,
      pageSize: 20,
      today,
      now,
      ...(filter === undefined ? {} : { filter }),
    });

  it('lists the active Plans ending within 3 days under «Por vencer»', async () => {
    const page = await list('expiring');
    expect(page.items.map(({ name }) => name)).toEqual([
      'Ana Vence',
      'Berta Vence',
    ]);
    expect(page.totalItems).toBe(2);
  });

  it('lists the active Plans with no class ahead under «Sin reservar»', async () => {
    const page = await list('unbooked');
    expect(page.items.map(({ name }) => name)).toEqual([
      'Berta Vence',
      'Carmen Libre',
      'Diana Pasada',
    ]);
  });

  it('counts both chips across the studio whatever the chip', async () => {
    await expect(list()).resolves.toMatchObject({
      studioClientCount: 7,
      expiringClientCount: 2,
      unbookedClientCount: 3,
    });
  });
});
