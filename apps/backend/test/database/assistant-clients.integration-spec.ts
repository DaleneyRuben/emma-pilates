import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createAssistantClientRepository } from '../../src/booking/assistant/prisma-assistant-client-repository';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');

describe('Assistant Client repository', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;
  const fixtures = buildDevelopmentFixtures({ today });
  const byEmail = (email: string) =>
    fixtures.clients.find((client) => client.email === email)!;
  const lucia = byEmail('lucia@example.com');
  const sofia = byEmail('sofia@example.com');
  const valeria = byEmail('valeria@example.com');
  const repository = () => createAssistantClientRepository(prisma);

  const createPendingClient = async (
    name: string,
    email: string,
    overrides: { disabledAt?: Date } = {},
  ): Promise<string> => {
    const client = await prisma.client.create({
      data: {
        id: randomUUID(),
        name,
        referralCode: randomUUID().slice(0, 8).toUpperCase(),
        account: {
          create: {
            id: randomUUID(),
            email,
            pendingExpiresAt: new Date('2026-10-21T00:00:00.000Z'),
            ...overrides,
          },
        },
      },
      select: { id: true },
    });
    return client.id;
  };

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

  it('searches active Clients by name, email, or phone regardless of case', async () => {
    await expect(
      repository().searchClients({ query: 'lucÍa', limit: 20 }),
    ).resolves.toEqual([
      {
        id: lucia.id,
        name: lucia.name,
        email: 'lucia@example.com',
        phone: lucia.phone,
        accountStatus: 'active',
      },
    ]);
    await expect(
      repository().searchClients({ query: 'VALERIA@', limit: 20 }),
    ).resolves.toEqual([expect.objectContaining({ id: valeria.id })]);
    await expect(
      repository().searchClients({ query: '70011004', limit: 20 }),
    ).resolves.toEqual([expect.objectContaining({ id: sofia.id })]);
  });

  it('orders matches by name and honours the limit', async () => {
    const all = await repository().searchClients({
      query: 'example.com',
      limit: 20,
    });
    expect(all.map((client) => client.name)).toEqual(
      [...all.map((client) => client.name)].sort((a, b) =>
        a.localeCompare(b, 'es'),
      ),
    );
    expect(all.length).toBeGreaterThanOrEqual(5);

    await expect(
      repository().searchClients({ query: 'example.com', limit: 2 }),
    ).resolves.toHaveLength(2);
  });

  it('reports pending and disabled Accounts and unknown Clients', async () => {
    const pendingId = await createPendingClient(
      'Pendiente Prueba',
      'pendiente@example.com',
    );
    const disabledId = await createPendingClient(
      'Baja Prueba',
      'baja@example.com',
      { disabledAt: new Date('2026-09-20T00:00:00.000Z') },
    );

    await expect(repository().findClient(pendingId)).resolves.toMatchObject({
      id: pendingId,
      name: 'Pendiente Prueba',
      email: 'pendiente@example.com',
      phone: null,
      accountStatus: 'pending',
    });
    await expect(repository().findClient(disabledId)).resolves.toMatchObject({
      accountStatus: 'disabled',
    });
    await expect(repository().findClient(randomUUID())).resolves.toBeNull();
    await expect(
      repository().searchClients({ query: 'Prueba', limit: 20 }),
    ).resolves.toEqual([
      expect.objectContaining({
        name: 'Baja Prueba',
        accountStatus: 'disabled',
      }),
      expect.objectContaining({
        name: 'Pendiente Prueba',
        accountStatus: 'pending',
      }),
    ]);
  });

  it('reads the available Credit from the ledger', async () => {
    await expect(repository().readAvailableCredit(sofia.id)).resolves.toBe(
      6_000,
    );
    await expect(repository().readAvailableCredit(lucia.id)).resolves.toBe(0);
  });
});
