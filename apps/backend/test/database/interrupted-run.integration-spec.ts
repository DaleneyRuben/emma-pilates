import { ChildProcess, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Pool } from 'pg';

const backendRoot = resolve(process.cwd());
const jestBin = resolve(backendRoot, 'node_modules/jest/bin/jest.js');

const waitFor = async (
  condition: () => Promise<boolean> | boolean,
  timeoutMs: number,
): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await condition()) return true;
    await new Promise((done) => {
      setTimeout(done, 200);
    });
  }
  return condition();
};

const exited = (child: ChildProcess): Promise<void> =>
  child.exitCode !== null || child.signalCode !== null
    ? Promise.resolve()
    : new Promise((done) => {
        child.once('exit', () => done());
      });

describe('an interrupted integration run', () => {
  const override = process.env.TEST_DATABASE_URL;
  const created: string[] = [];
  let adminPool: Pool | undefined;
  let scratch: string | undefined;

  const databaseExists = async (name: string): Promise<boolean> => {
    const result = await adminPool!.query<{ exists: boolean }>(
      'select exists(select 1 from pg_database where datname = $1) as exists',
      [name],
    );
    return result.rows[0].exists;
  };

  // Starts a child Jest run of interrupted-run.fixture.ts and returns it with
  // the name of the disposable database its context created.
  const startChildRun = async (
    mode: 'wait' | 'throw',
  ): Promise<{ child: ChildProcess; name: string }> => {
    scratch ??= mkdtempSync(join(tmpdir(), 'pilates-interrupted-run-'));
    const out = join(scratch, `${mode}-${created.length}`);
    const child = spawn(
      process.execPath,
      [
        jestBin,
        '--config',
        'test/jest-integration.json',
        '--runInBand',
        '--forceExit',
        '--testRegex',
        'interrupted-run\\.fixture\\.ts$',
      ],
      {
        cwd: backendRoot,
        env: {
          ...process.env,
          NODE_OPTIONS: '--experimental-vm-modules',
          INTERRUPTED_RUN_OUT: out,
          INTERRUPTED_RUN_MODE: mode,
        },
        stdio: 'ignore',
      },
    );

    const started = await waitFor(
      () => existsSync(out) && readFileSync(out, 'utf8') !== '',
      60_000,
    );
    if (!started) {
      child.kill('SIGKILL');
      throw new Error('the child run never started its database context');
    }
    const name = readFileSync(out, 'utf8');
    created.push(name);
    return { child, name };
  };

  beforeAll(() => {
    if (override !== undefined) {
      adminPool = new Pool({ connectionString: override, max: 1 });
    }
  });

  afterAll(async () => {
    // Whatever a failing run left behind is dropped by its exact name.
    for (const name of created) {
      await adminPool?.query(`drop database if exists "${name}" with (force)`);
    }
    await adminPool?.end();
    if (scratch !== undefined)
      rmSync(scratch, { recursive: true, force: true });
  });

  it.each(['SIGINT', 'SIGTERM', 'SIGKILL'] as const)(
    'leaves no database behind when the run gets %s',
    async (signal) => {
      if (override === undefined) return;

      const { child, name } = await startChildRun('wait');
      await expect(databaseExists(name)).resolves.toBe(true);

      child.kill(signal);
      await exited(child);

      await expect(
        waitFor(async () => !(await databaseExists(name)), 15_000),
      ).resolves.toBe(true);
    },
  );

  it('leaves no database behind when the run ends without stop', async () => {
    if (override === undefined) return;

    const { child, name } = await startChildRun('throw');
    await exited(child);

    await expect(
      waitFor(async () => !(await databaseExists(name)), 15_000),
    ).resolves.toBe(true);
  });
});
