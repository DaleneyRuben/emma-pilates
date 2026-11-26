import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { lookUpReferralCode } from '../../src/booking/acquisition/referral-code-lookup';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

// Walkthrough n.º 18 (C01b5, C01b6): «Crea tu cuenta» checks a typed code
// before the Account exists, shows whose it is by her first name, and flags
// one that does not exist.
describe('looking up a referral code before registering', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const code = () =>
    `L${randomUUID().replace(/-/g, '').slice(0, 8)}`.toUpperCase();

  it('names a live Client’s code by her first name, whatever the case typed', async () => {
    const lucia = code();
    const client = await prisma.client.create({
      data: { name: 'Lucía Fernández', referralCode: lucia },
      select: { id: true },
    });
    await prisma.referralCode.create({
      data: { code: lucia, clientId: client.id },
    });

    await expect(
      lookUpReferralCode(prisma, ` ${lucia.toLowerCase()} `),
    ).resolves.toEqual({
      code: lucia,
      status: 'valid',
      holderFirstName: 'Lucía',
    });
  });

  it('flags a code nobody holds', async () => {
    await expect(lookUpReferralCode(prisma, 'NADIE-123')).resolves.toEqual({
      code: 'NADIE-123',
      status: 'unknown',
      holderFirstName: null,
    });
  });

  it('flags a retired code as unknown', async () => {
    const retired = code();
    const client = await prisma.client.create({
      data: { name: 'Sofía Gómez', referralCode: `S-${randomUUID()}` },
      select: { id: true },
    });
    await prisma.referralCode.create({
      data: { code: retired, clientId: client.id, retiredAt: new Date() },
    });

    await expect(lookUpReferralCode(prisma, retired)).resolves.toMatchObject({
      status: 'unknown',
    });
  });
});
