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
    // A Client's code joins the registry when she is created.
    await prisma.client.create({
      data: { name: 'Lucía Fernández', referralCode: lucia },
    });

    await expect(
      lookUpReferralCode(prisma, ` ${lucia.toLowerCase()} `),
    ).resolves.toEqual({
      code: lucia,
      status: 'valid',
      holderFirstName: 'Lucía',
      holderKind: 'client',
    });
  });

  it('flags a code nobody holds', async () => {
    await expect(lookUpReferralCode(prisma, 'NADIE-123')).resolves.toEqual({
      code: 'NADIE-123',
      status: 'unknown',
      holderFirstName: null,
      holderKind: null,
    });
  });

  it('names a Trainer’s code as hers', async () => {
    const daniela = code();
    await prisma.staffMember.create({
      data: { name: 'Daniela Ortiz', role: 'TRAINER', referralCode: daniela },
    });

    await expect(lookUpReferralCode(prisma, daniela)).resolves.toEqual({
      code: daniela,
      status: 'valid',
      holderFirstName: 'Daniela',
      holderKind: 'trainer',
    });
  });

  it('flags a retired code as unknown', async () => {
    const retired = code();
    await prisma.client.create({
      data: { name: 'Sofía Gómez', referralCode: retired },
    });
    await prisma.referralCode.update({
      where: { code: retired },
      data: { retiredAt: new Date() },
    });

    await expect(lookUpReferralCode(prisma, retired)).resolves.toMatchObject({
      status: 'unknown',
    });
  });
});
