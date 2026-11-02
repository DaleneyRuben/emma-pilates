import { PrismaClient } from '../../src/generated/prisma/client';
import { createPrismaAdapter } from '../../src/database/prisma-adapter';
import { createPrismaScriptRunStore } from '../../src/script-runner/prisma-script-run-store';
import {
  startDatabaseTestContext,
  type DatabaseTestContext,
} from './database-test-context';

const at = (minute: number) =>
  new Date(Date.UTC(2026, 9, 31, 15, minute, 0, 0));

describe('the Run Script record (REL-016)', () => {
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

  it('keeps every run with its params, link, outcome, and error', async () => {
    const store = createPrismaScriptRunStore(prisma);

    const id = await store.start({
      scriptName: 'record-demo',
      params: { email: 'a@b.c' },
      dryRun: false,
      runUrl: 'https://github.com/o/r/actions/runs/7',
      startedAt: at(0),
    });
    expect(await store.latest('record-demo')).toEqual({
      status: 'running',
      startedAt: at(0),
    });

    await store.finish(id, {
      status: 'failure',
      finishedAt: at(1),
      errorMessage: 'Error: client_not_found',
    });

    const row = await prisma.scriptRun.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({
      scriptName: 'record-demo',
      status: 'failure',
      params: { email: 'a@b.c' },
      dryRun: false,
      runUrl: 'https://github.com/o/r/actions/runs/7',
      startedAt: at(0),
      finishedAt: at(1),
      errorMessage: 'Error: client_not_found',
      deletedAt: null,
    });
  });

  it('answers the newest real run, never a dry one or another script', async () => {
    const store = createPrismaScriptRunStore(prisma);
    const first = await store.start({
      scriptName: 'latest-demo',
      params: {},
      dryRun: false,
      runUrl: null,
      startedAt: at(10),
    });
    await store.finish(first, {
      status: 'success',
      finishedAt: at(11),
      errorMessage: null,
    });
    await store.start({
      scriptName: 'latest-demo',
      params: {},
      dryRun: true,
      runUrl: null,
      startedAt: at(20),
    });
    await store.start({
      scriptName: 'other-demo',
      params: {},
      dryRun: false,
      runUrl: null,
      startedAt: at(30),
    });

    expect(await store.latest('latest-demo')).toEqual({
      status: 'success',
      startedAt: at(10),
    });
    expect(await store.latest('never-ran')).toBeNull();
  });

  it('refuses a status outside running, success, and failure', async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO "system"."script_runs"
          ("id", "script_name", "status", "started_at")
        VALUES (gen_random_uuid(), 'bad', 'done', now())`,
    ).rejects.toThrow();
  });
});
