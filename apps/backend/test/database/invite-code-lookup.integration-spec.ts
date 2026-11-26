import { PrismaClient } from '../../src/generated/prisma/client';
import { lookUpInviteCode } from '../../src/booking/acquisition/invite-code-lookup';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { applyDevelopmentFixtures } from '../../src/development-fixtures/apply-development-fixtures';
import { buildDevelopmentFixtures } from '../../src/development-fixtures/development-fixtures';
import {
  DatabaseTestContext,
  startDatabaseTestContext,
} from './database-test-context';

const now = new Date(Date.now() + 60_000);
const today = new Date(
  Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
);

// Walkthrough n.º 13 + 22 (review): the invite page promises a free class
// only for a code that opens a Guest Pass, a Client's with a paid Plan in
// force, the rule registration applies.
describe('the code behind an invite link', () => {
  let context: DatabaseTestContext;
  let prisma: PrismaClient;

  beforeAll(async () => {
    context = await startDatabaseTestContext();
    prisma = new PrismaClient({
      adapter: createPrismaAdapter(context.databaseUrl),
    });
    await applyDevelopmentFixtures(prisma, {
      fixtures: buildDevelopmentFixtures({ today }),
      passwordHash: 'not-a-real-hash',
    });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await context?.stop();
  });

  const codeOf = async (email: string) =>
    (
      await prisma.account.findFirstOrThrow({
        where: { email, deletedAt: null },
        select: { client: { select: { referralCode: true } } },
      })
    ).client!.referralCode;

  it('promises a free class for a Client with a paid Plan in force', async () => {
    await expect(
      lookUpInviteCode(prisma, await codeOf('lucia@example.com'), now),
    ).resolves.toMatchObject({
      status: 'valid',
      holderFirstName: 'Lucía',
      holderKind: 'client',
      freeClass: true,
    });
  });

  it.each(['mariana@example.com', 'sofia@example.com'])(
    'promises none for %s, who has no paid Plan in force',
    async (email) => {
      await expect(
        lookUpInviteCode(prisma, await codeOf(email), now),
      ).resolves.toMatchObject({
        status: 'valid',
        holderKind: 'client',
        freeClass: false,
      });
    },
  );

  it('promises none for an unknown code', async () => {
    await expect(lookUpInviteCode(prisma, 'NO-SUCH', now)).resolves.toEqual({
      code: 'NO-SUCH',
      status: 'unknown',
      holderFirstName: null,
      holderKind: null,
      freeClass: false,
    });
  });
});
