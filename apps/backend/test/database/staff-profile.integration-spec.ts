import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { createCatalogRepository } from '../../src/booking/catalog/prisma-catalog-repository';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const today = new Date('2026-09-21T00:00:00.000Z');

describe('Staff profile read', () => {
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

  it('reads the Staff Member with Account email, Role, and Branch names', async () => {
    const emma = fixtures.staffMembers.find(
      (member) => member.email === 'emma.vargas@example.com',
    )!;

    await expect(
      createCatalogRepository(prisma).findStaffProfile(emma.id),
    ).resolves.toEqual({
      id: emma.id,
      name: 'Emma Vargas',
      email: 'emma.vargas@example.com',
      phone: null,
      role: 'trainer',
      branches: [
        expect.objectContaining({ name: 'Centro' }),
        expect.objectContaining({ name: 'Equipetrol' }),
        expect.objectContaining({ name: 'Urubó' }),
      ],
    });
  });

  it('returns null for an unknown Staff Member', async () => {
    await expect(
      createCatalogRepository(prisma).findStaffProfile(
        '00000000-0000-4000-8000-000000000000',
      ),
    ).resolves.toBeNull();
  });
});
