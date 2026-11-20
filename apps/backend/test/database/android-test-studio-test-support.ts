import { createHmac } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PgBoss } from 'pg-boss';
import { PrismaClient } from '../../src/generated/prisma/client';
import { AUTHENTICATION_EMAIL_QUEUE } from '../../src/jobs/authentication-email/authentication-email-job';
import type { ScriptAuthenticationEmail } from '../../src/script-runner/run-script';
import { androidTestStudio } from '../../src/script-runner/scripts/android-test-studio';
import { AuthenticationLinkCipher } from '../../src/system-identity/security/authentication-link-cipher';
import { startDatabaseTestContext } from './database-test-context';

export type Logged = { event: string; fields: Record<string, unknown> };

export const administratorEmail = 'emmapilatesstudio@gmail.com';

// Fake testers: the real ones arrive only as the run's params.
export const clients = [
  { email: 'Ana.Prueba@example.com', name: 'Ana Prueba', phone: '7123 4567' },
  {
    email: 'bea.prueba@example.com',
    name: 'Bea Prueba',
    phone: '+591 61234567',
  },
];

// A migrated, empty database (production after its reset) with the pg-boss
// schema the Activation Link emails are queued in.
export const startStudioWorld = async () => {
  const context = await startDatabaseTestContext();
  const prisma = new PrismaClient({ adapter: new PrismaPg(context.pool) });
  const boss = new PgBoss({
    db: {
      executeSql: async (text, values) => {
        const result = await context.pool.query(text, values);
        return { rows: result.rows };
      },
    },
    schema: 'pgboss',
    migrate: false,
  });
  const authenticationEmail: ScriptAuthenticationEmail = {
    boss,
    digestEmail: (email) =>
      createHmac('sha256', 'test-email-digest-key').update(email).digest(),
    linkCipher: new AuthenticationLinkCipher(
      'local-test-key',
      Buffer.alloc(32, 7),
    ),
  };

  const run = async (
    params: Record<string, unknown>,
    options: { dryRun?: boolean; at?: Date; withKeys?: boolean } = {},
  ): Promise<Logged[]> => {
    const logged: Logged[] = [];
    await androidTestStudio.run({
      prisma,
      params,
      dryRun: options.dryRun ?? false,
      now: () => options.at ?? new Date(),
      log: (event, fields = {}) => logged.push({ event, fields }),
      authenticationEmail:
        options.withKeys === false ? undefined : authenticationEmail,
    });
    return logged;
  };

  const queuedEmails = async (): Promise<number> =>
    (await boss.findJobs(AUTHENTICATION_EMAIL_QUEUE, { queued: true })).length;

  const counts = async () => ({
    accounts: await prisma.account.count(),
    branches: await prisma.branch.count(),
    classTypes: await prisma.classType.count(),
    plans: await prisma.plan.count(),
    staffMembers: await prisma.staffMember.count(),
    clients: await prisma.client.count(),
    schedules: await prisma.sessionSchedule.count(),
    sessions: await prisma.session.count(),
    availabilityBlocks: await prisma.availabilityBlock.count(),
    settingsVersions: await prisma.studioSettingsVersion.count(),
    payments: await prisma.payment.count(),
    audits: await prisma.auditRecord.count(),
    emails: await queuedEmails(),
  });

  return {
    prisma,
    run,
    counts,
    queuedEmails,
    stop: async () => {
      await prisma.$disconnect();
      await context.stop();
    },
  };
};

export type StudioWorld = Awaited<ReturnType<typeof startStudioWorld>>;

export const eventsOf = (logged: Logged[]): string[] =>
  logged.map((entry) => entry.event);

export const fieldsOf = (
  logged: Logged[],
  event: string,
): Record<string, unknown> | undefined =>
  logged.find((entry) => entry.event === event)?.fields;
