import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createCatalogRepository } from '../../src/booking/catalog/prisma-catalog-repository';
import { listSessionAvailability } from '../../src/booking/session-availability';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import {
  buildDevelopmentFixtures,
  type DevelopmentFixtures,
} from '../../src/development-fixtures/development-fixtures';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');
const day = 24 * 60 * 60 * 1_000;

const clientNamed = (fixtures: DevelopmentFixtures, email: string) => {
  const client = fixtures.clients.find((c) => c.email === email);
  if (!client) throw new Error(`missing client ${email}`);
  return client;
};

describe('Client discovery reads', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const fixtures = buildDevelopmentFixtures({ today });

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
    await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: 'not-a-real-hash',
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  it('reads the Client profile with its Account email', async () => {
    const lucia = clientNamed(fixtures, 'lucia@example.com');

    await expect(
      createCatalogRepository(prisma).findClientProfile(lucia.id),
    ).resolves.toEqual({
      id: lucia.id,
      name: 'Lucía Fernández',
      email: 'lucia@example.com',
      phone: '+591 70011001',
      referralCode: 'REF-LUCIA',
      photo: null,
    });
  });

  it('saves Client profile changes and returns the updated profile', async () => {
    const isabel = clientNamed(fixtures, 'isabel@example.com');
    const repository = createCatalogRepository(prisma);

    await expect(
      repository.saveClientProfile(isabel.id, {
        name: 'Isabel Arce Rojas',
        phone: null,
      }),
    ).resolves.toEqual({
      id: isabel.id,
      name: 'Isabel Arce Rojas',
      email: 'isabel@example.com',
      phone: null,
      referralCode: 'REF-ISABEL',
      photo: null,
    });
    await expect(
      prisma.client.findUniqueOrThrow({ where: { id: isabel.id } }),
    ).resolves.toMatchObject({ name: 'Isabel Arce Rojas', phone: null });
  });

  it('finds the latest Subscription for an expired Client', async () => {
    const sofia = clientNamed(fixtures, 'sofia@example.com');
    const repository = createCatalogRepository(prisma);

    await expect(
      repository.findActiveSubscription(sofia.id, today),
    ).resolves.toBeNull();
    await expect(
      repository.findLatestSubscription(sofia.id),
    ).resolves.toMatchObject({
      planNameSnapshot: 'Paquete de 8 clases',
      endsOn: new Date(today.getTime() - 10 * day),
    });
    await expect(
      repository.findLatestSubscription(
        clientNamed(fixtures, 'mariana@example.com').id,
      ),
    ).resolves.toBeNull();
  });

  it('lists open Branches and Class Types in a stable order', async () => {
    const repository = createCatalogRepository(prisma);

    await expect(repository.listBranches()).resolves.toEqual([
      expect.objectContaining({
        name: 'Centro',
        address: 'Calle Ayacucho 245',
      }),
      expect.objectContaining({ name: 'Equipetrol' }),
      expect.objectContaining({ name: 'Urubó' }),
    ]);
    await expect(repository.listClassTypes()).resolves.toEqual([
      expect.objectContaining({ name: 'Mat Pilates' }),
      expect.objectContaining({ name: 'Pilates Prenatal' }),
      expect.objectContaining({ name: 'Reformer Pilates' }),
    ]);
  });

  it('finds a visible Plan and hides missing ones', async () => {
    const repository = createCatalogRepository(prisma);
    const plan = fixtures.plans[0];

    await expect(repository.findVisiblePlan(plan.id)).resolves.toEqual({
      id: plan.id,
      name: 'Paquete de 8 clases',
      durationMonths: 1,
      classAllowance: 8,
      priceCentavos: 56_000,
      displayOrder: 0,
    });
    await expect(
      repository.findVisiblePlan('00000000-0000-4000-8000-000000000000'),
    ).resolves.toBeNull();
  });

  it('describes a Session with its Class Type, Trainer, Branch, and availability', async () => {
    const centro = fixtures.branches.find((b) => b.name === 'Centro');
    const session = fixtures.sessions.find(
      (s) =>
        s.branchId === centro?.id &&
        s.startsAt.toISOString() === '2026-09-21T11:00:00.000Z',
    );

    const detail = await createCatalogRepository(prisma).findSessionDetail(
      session!.id,
    );

    expect(detail).toMatchObject({
      id: session!.id,
      branch: { id: centro!.id, name: 'Centro', address: 'Calle Ayacucho 245' },
      classType: {
        id: session!.classTypeId,
        name: 'Reformer Pilates',
        durationMinutes: 50,
      },
      trainerName: 'Emma Vargas',
      startsAt: session!.startsAt,
      endsAt: session!.endsAt,
      capacity: 12,
      bookedCount: 0,
      availableSeats: 12,
      waitlistCount: 0,
    });
    expect(detail?.classType.description).toContain('Reformer');
  });

  it('names the Class Type and Trainer in Session availability', async () => {
    const centro = fixtures.branches.find((b) => b.name === 'Centro');
    const [first] = await listSessionAvailability(prisma)({
      branchId: centro!.id,
      from: today,
      until: new Date(today.getTime() + day),
      limit: 10,
    });

    expect(first).toMatchObject({
      classTypeName: 'Reformer Pilates',
      trainerName: 'Emma Vargas',
      availableSeats: 12,
    });
  });
});
