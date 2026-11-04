import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdministratorClients } from '../../src/booking/clients/prisma-administrator-clients';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');

// WEB-040 (follow-up 232): Clientas › Todas filters by one chip and shows
// «Le quedan», «Vence», «Invitada por», and the Fundadora number.
describe('Administrator Client directory chips and columns (PostgreSQL)', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const directory = () => createPrismaAdministratorClients(prisma);
  const ids = {
    activa: randomUUID(),
    vencida: randomUUID(),
    nueva: randomUUID(),
    perdida: randomUUID(),
  };

  const createClient = (id: string, name: string) =>
    prisma.client.create({
      data: {
        id,
        name,
        referralCode: `REF-${id.slice(0, 8)}`,
        account: {
          create: {
            email: `${id}@example.com`,
            activatedAt: new Date('2026-01-01T12:00:00.000Z'),
          },
        },
      },
    });

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    const plan = await prisma.plan.create({
      data: {
        name: 'Mensual 16 clases',
        durationDays: 30,
        classAllowance: 16,
        priceCentavos: 90_000,
        displayOrder: 1,
      },
    });
    const carla = await prisma.staffMember.create({
      data: { name: 'Carla Rojas', role: 'TRAINER', referralCode: 'CARLA' },
    });
    await createClient(ids.activa, 'Isabel Arce');
    await createClient(ids.vencida, 'Sofía Guzmán');
    await createClient(ids.nueva, 'Mariana Peña');
    await createClient(ids.perdida, 'Paula Lora');
    const subscription = {
      planId: plan.id,
      planNameSnapshot: 'Mensual 16 clases',
      durationDaysSnapshot: 30,
      originalClassAllowance: 16,
    };
    await prisma.subscription.createMany({
      data: [
        {
          ...subscription,
          clientId: ids.activa,
          remainingClassAllowance: 9,
          startsOn: new Date('2026-09-10'),
          endsOn: new Date('2026-10-09'),
          activatedAt: new Date('2026-09-10T12:00:00.000Z'),
        },
        {
          ...subscription,
          clientId: ids.vencida,
          remainingClassAllowance: 0,
          startsOn: new Date('2026-07-01'),
          endsOn: new Date('2026-07-30'),
          activatedAt: new Date('2026-07-01T12:00:00.000Z'),
        },
        {
          ...subscription,
          clientId: ids.vencida,
          remainingClassAllowance: 2,
          startsOn: new Date('2026-08-01'),
          endsOn: new Date('2026-08-30'),
          activatedAt: new Date('2026-08-01T12:00:00.000Z'),
        },
      ],
    });
    await prisma.founderMembership.createMany({
      data: [
        { clientId: ids.activa, number: 2, since: new Date('2026-05-01') },
        {
          clientId: ids.perdida,
          number: 5,
          since: new Date('2026-05-02'),
          status: 'LOST',
          reason: 'did_not_renew',
          lostAt: new Date('2026-07-01'),
        },
      ],
    });
    // A Trainer's code wins over a Client's (booking ADR-0009); a live
    // acquisition names who invited her before an older Referral does.
    await prisma.clientAcquisition.createMany({
      data: [
        {
          clientId: ids.nueva,
          declaredChannel: 'FRIEND',
          channel: 'FRIEND',
          referralCode: 'SOFIA',
          referrerClientId: ids.vencida,
        },
        {
          clientId: ids.activa,
          declaredChannel: 'TRAINER',
          channel: 'TRAINER',
          referralCode: 'CARLA',
          referrerStaffMemberId: carla.id,
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const names = async (
    filter?: 'active' | 'none' | 'expired' | 'founder',
    query?: string,
  ) =>
    (
      await directory().list({
        page: 1,
        pageSize: 20,
        today,
        ...(filter === undefined ? {} : { filter }),
        ...(query === undefined ? {} : { query }),
      })
    ).items.map(({ name }) => name);

  it('filters by plan state and by a live Fundadora place', async () => {
    expect(await names('active')).toEqual(['Isabel Arce']);
    expect(await names('expired')).toEqual(['Sofía Guzmán']);
    expect(await names('none')).toEqual(['Mariana Peña', 'Paula Lora']);
    expect(await names('founder')).toEqual(['Isabel Arce']);
    expect(await names('none', 'mariana')).toEqual(['Mariana Peña']);
    expect(await names('founder', 'sofia')).toEqual([]);
  });

  it('counts the matches for the chip and the studio whatever the chip', async () => {
    await expect(
      directory().list({ page: 1, pageSize: 1, today, filter: 'none' }),
    ).resolves.toMatchObject({
      totalItems: 2,
      studioClientCount: 4,
      activePlanClientCount: 1,
      founderClientCount: 1,
    });
  });

  it('reads what is left, when it ends, the Fundadora number, and who invited her', async () => {
    const { items } = await directory().list({ page: 1, pageSize: 20, today });
    const byName = new Map(items.map((item) => [item.name, item]));

    expect(byName.get('Isabel Arce')).toMatchObject({
      remainingClassAllowance: 9,
      originalClassAllowance: 16,
      planEndsOn: new Date('2026-10-09T00:00:00.000Z'),
      founderNumber: 2,
      invitedByName: 'Carla Rojas',
    });
    // The last Plan's end, so the row can say when it expired.
    expect(byName.get('Sofía Guzmán')).toMatchObject({
      subscriptionStatus: 'expired',
      remainingClassAllowance: null,
      originalClassAllowance: null,
      planEndsOn: new Date('2026-08-30T00:00:00.000Z'),
      founderNumber: null,
      invitedByName: null,
    });
    expect(byName.get('Mariana Peña')).toMatchObject({
      planEndsOn: null,
      invitedByName: 'Sofía Guzmán',
    });
    // A lost place no longer makes her a Fundadora.
    expect(byName.get('Paula Lora')).toMatchObject({ founderNumber: null });
  });
});
