import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdministratorClients } from '../../src/booking/clients/prisma-administrator-clients';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');

describe('Administrator Client directory (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const directory = () => createPrismaAdministratorClients(prisma);
  const ids = {
    lucia: randomUUID(),
    sofia: randomUUID(),
    ana: randomUUID(),
    noAccount: randomUUID(),
  };

  const createClient = async (input: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    referralCode: string;
    createdAt?: Date;
    activatedAt?: Date | null;
  }) => {
    await prisma.client.create({
      data: {
        id: input.id,
        name: input.name,
        phone: input.phone ?? null,
        referralCode: input.referralCode,
        ...(input.createdAt === undefined
          ? {}
          : { createdAt: input.createdAt }),
        ...(input.email === undefined
          ? {}
          : {
              account: {
                create: {
                  email: input.email,
                  activatedAt:
                    input.activatedAt === undefined
                      ? new Date('2026-01-01T12:00:00.000Z')
                      : input.activatedAt,
                },
              },
            }),
      },
    });
  };

  const subscribe = async (
    clientId: string,
    planId: string,
    range: { startsOn: string; endsOn: string; remaining: number },
  ) => {
    await prisma.subscription.create({
      data: {
        clientId,
        planId,
        planNameSnapshot: 'Paquete de 8 clases',
        durationMonthsSnapshot: 1,
        originalClassAllowance: 8,
        remainingClassAllowance: range.remaining,
        startsOn: new Date(range.startsOn),
        endsOn: new Date(range.endsOn),
        activatedAt: new Date(`${range.startsOn}T12:00:00.000Z`),
      },
    });
  };

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    const plan = await prisma.plan.create({
      data: {
        name: 'Paquete de 8 clases',
        durationMonths: 1,
        classAllowance: 8,
        priceCentavos: 56_000,
        displayOrder: 1,
      },
    });
    await createClient({
      id: ids.lucia,
      name: 'Lucía Fernández',
      email: 'lucia@example.com',
      phone: '+591 70011001',
      referralCode: 'LUCIA25',
      // 23:00 on 2 July in Bolivia, already 3 July in UTC.
      createdAt: new Date('2025-07-03T03:00:00.000Z'),
    });
    await createClient({
      id: ids.sofia,
      name: 'Sofía Guzmán',
      email: 'sofia@example.com',
      phone: '+591 70011004',
      referralCode: 'SOFIA26',
    });
    await createClient({
      id: ids.ana,
      name: 'Ana Quiroga',
      email: 'ana.quiroga@example.com',
      referralCode: 'ANA26',
      activatedAt: null,
    });
    await createClient({
      id: ids.noAccount,
      name: 'Beatriz sin cuenta',
      referralCode: 'BEA26',
    });
    await subscribe(ids.lucia, plan.id, {
      startsOn: '2026-09-01',
      endsOn: '2026-09-30',
      remaining: 5,
    });
    await subscribe(ids.sofia, plan.id, {
      startsOn: '2026-06-01',
      endsOn: '2026-06-30',
      remaining: 0,
    });
    await prisma.referral.createMany({
      data: [
        { referrerClientId: ids.lucia, referredClientId: ids.sofia },
        { referrerClientId: ids.lucia, referredClientId: ids.ana },
      ],
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('pages every Client with an Account by name with the current Plan and the studio counts', async () => {
    const counts = { studioClientCount: 3, activePlanClientCount: 1 };

    await expect(
      directory().list({ page: 1, pageSize: 2, today }),
    ).resolves.toEqual({
      items: [
        {
          id: ids.ana,
          name: 'Ana Quiroga',
          email: 'ana.quiroga@example.com',
          phone: null,
          accountStatus: 'pending',
          planName: null,
          subscriptionStatus: 'none',
        },
        {
          id: ids.lucia,
          name: 'Lucía Fernández',
          email: 'lucia@example.com',
          phone: '+591 70011001',
          accountStatus: 'active',
          planName: 'Paquete de 8 clases',
          subscriptionStatus: 'active',
        },
      ],
      page: 1,
      pageSize: 2,
      totalItems: 3,
      ...counts,
    });
    await expect(
      directory().list({ page: 2, pageSize: 2, today }),
    ).resolves.toMatchObject({
      items: [
        expect.objectContaining({
          id: ids.sofia,
          planName: null,
          subscriptionStatus: 'expired',
        }),
      ],
      totalItems: 3,
      ...counts,
    });
  });

  it('searches names and emails without accents or case, phones by digits, and wildcards literally', async () => {
    const found = async (query: string) =>
      (await directory().list({ page: 1, pageSize: 20, query, today })).items
        .map(({ id }) => id)
        .sort();

    expect(await found('lucia')).toEqual([ids.lucia]);
    expect(await found('GUZMAN')).toEqual([ids.sofia]);
    expect(await found('QUIROGA@')).toEqual([ids.ana]);
    expect(await found('7001100')).toEqual([ids.lucia, ids.sofia].sort());
    expect(await found('%_')).toEqual([]);
    expect(await found('beatriz')).toEqual([]);
    await expect(
      directory().list({ page: 1, pageSize: 20, query: 'nadie', today }),
    ).resolves.toMatchObject({
      items: [],
      totalItems: 0,
      studioClientCount: 3,
      activePlanClientCount: 1,
    });
  });

  it('reads one Client with the Bolivia creation date, referral code, and referral count', async () => {
    await expect(directory().read(ids.lucia)).resolves.toEqual({
      id: ids.lucia,
      name: 'Lucía Fernández',
      email: 'lucia@example.com',
      phone: '+591 70011001',
      accountStatus: 'active',
      clientSince: new Date('2025-07-02T00:00:00.000Z'),
      referralCode: 'LUCIA25',
      referredClientCount: 2,
    });
    await expect(
      directory().findActiveSubscription(ids.lucia, today),
    ).resolves.toMatchObject({
      planName: 'Paquete de 8 clases',
      originalClassAllowance: 8,
      remainingClassAllowance: 5,
    });
    await expect(
      directory().findLatestSubscription(ids.sofia),
    ).resolves.toMatchObject({ endsOn: new Date('2026-06-30') });
    await expect(directory().read(ids.noAccount)).resolves.toBeNull();
    await expect(directory().read(randomUUID())).resolves.toBeNull();
  });

  it('leaves a removed Client out of the directory, its counts, and reads', async () => {
    const removedId = randomUUID();
    const removedAt = new Date('2026-09-22T00:00:00.000Z');
    await createClient({
      id: removedId,
      name: 'Retirada Prueba',
      email: 'retirada@example.com',
      referralCode: 'REF-RETIRADA',
      activatedAt: null,
    });
    await prisma.account.updateMany({
      where: { clientId: removedId },
      data: { deletedAt: removedAt },
    });
    await prisma.client.update({
      where: { id: removedId },
      data: { deletedAt: removedAt },
    });

    await expect(
      directory().list({ page: 1, pageSize: 50, today }),
    ).resolves.toMatchObject({ totalItems: 3, studioClientCount: 3 });
    await expect(
      directory().list({ page: 1, pageSize: 50, query: 'Retirada', today }),
    ).resolves.toMatchObject({ items: [], totalItems: 0 });
    await expect(directory().read(removedId)).resolves.toBeNull();
  });
});
