import type { PrismaClient } from '../generated/prisma/client';
import {
  runScript,
  type ScriptDefinition,
  type ScriptRunRecord,
  type ScriptRunStore,
} from './run-script';
import type { ScriptCommand } from './script-command';

const now = new Date('2026-10-31T15:00:00.000Z');
const hour = 60 * 60 * 1_000;

const fakeStore = (latest: ScriptRunRecord | null = null) => {
  const started: Parameters<ScriptRunStore['start']>[0][] = [];
  const finished: Parameters<ScriptRunStore['finish']>[] = [];
  const store: ScriptRunStore = {
    latest: () => Promise.resolve(latest),
    start: (input) => {
      started.push(input);
      return Promise.resolve(`run-${started.length}`);
    },
    finish: (...args) => {
      finished.push(args);
      return Promise.resolve();
    },
  };
  return { store, started, finished };
};

const command = (overrides: Partial<ScriptCommand> = {}): ScriptCommand => ({
  scriptName: 'demo',
  params: {},
  dryRun: false,
  forceRerun: false,
  runUrl: 'https://github.com/o/r/actions/runs/7',
  ...overrides,
});

const run = (
  scripts: Record<string, ScriptDefinition>,
  input: ScriptCommand,
  store: ScriptRunStore,
) =>
  runScript({
    command: input,
    scripts,
    store,
    prisma: {} as PrismaClient,
    now: () => now,
    log: () => undefined,
  });

describe('the Run Script runner', () => {
  it('runs the script with its params and records the success', async () => {
    const calls: unknown[] = [];
    const { store, started, finished } = fakeStore();

    const result = await run(
      {
        demo: {
          requiredParams: ['email'],
          run: (context) => {
            calls.push([context.params, context.dryRun]);
            return Promise.resolve();
          },
        },
      },
      command({ params: { email: 'a@b.c' } }),
      store,
    );

    expect(result).toEqual({ outcome: 'success' });
    expect(calls).toEqual([[{ email: 'a@b.c' }, false]]);
    expect(started).toEqual([
      {
        scriptName: 'demo',
        params: { email: 'a@b.c' },
        dryRun: false,
        runUrl: 'https://github.com/o/r/actions/runs/7',
        startedAt: now,
      },
    ]);
    expect(finished).toEqual([
      ['run-1', { status: 'success', finishedAt: now, errorMessage: null }],
    ]);
  });

  it('records a failure with the error and reports it', async () => {
    const { store, finished } = fakeStore();

    const result = await run(
      { demo: { run: () => Promise.reject(new Error('client_not_found')) } },
      command(),
      store,
    );

    expect(result).toEqual({
      outcome: 'failed',
      detail: 'Error: client_not_found',
    });
    expect(finished).toEqual([
      [
        'run-1',
        {
          status: 'failure',
          finishedAt: now,
          errorMessage: 'Error: client_not_found',
        },
      ],
    ]);
  });

  it('refuses a script this release does not carry', async () => {
    const { store, started } = fakeStore();

    expect(await run({}, command(), store)).toEqual({
      outcome: 'refused',
      code: 'script_unknown',
    });
    expect(started).toEqual([]);
  });

  it('refuses a run without the params the script requires', async () => {
    const { store, started } = fakeStore();

    expect(
      await run(
        { demo: { requiredParams: ['email'], run: () => Promise.resolve() } },
        command(),
        store,
      ),
    ).toEqual({ outcome: 'refused', code: 'params_missing', detail: 'email' });
    expect(started).toEqual([]);
  });

  describe('run-once protection', () => {
    const demo = { demo: { run: () => Promise.resolve() } };

    it('refuses a script that already succeeded unless forced', async () => {
      const latest = { status: 'success' as const, startedAt: now };

      expect(await run(demo, command(), fakeStore(latest).store)).toEqual({
        outcome: 'refused',
        code: 'already_succeeded',
      });
      expect(
        await run(demo, command({ forceRerun: true }), fakeStore(latest).store),
      ).toEqual({ outcome: 'success' });
    });

    it('refuses while a run started less than two hours ago is still running', async () => {
      const fresh = {
        status: 'running' as const,
        startedAt: new Date(now.getTime() - hour),
      };
      const stale = {
        status: 'running' as const,
        startedAt: new Date(now.getTime() - 3 * hour),
      };

      expect(await run(demo, command(), fakeStore(fresh).store)).toEqual({
        outcome: 'refused',
        code: 'already_running',
      });
      expect(await run(demo, command(), fakeStore(stale).store)).toEqual({
        outcome: 'success',
      });
    });

    it('runs again after a failure', async () => {
      const failed = { status: 'failure' as const, startedAt: now };

      expect(await run(demo, command(), fakeStore(failed).store)).toEqual({
        outcome: 'success',
      });
    });

    it('lets a dry run through and records it as one', async () => {
      const latest = { status: 'success' as const, startedAt: now };
      const { store, started } = fakeStore(latest);

      expect(await run(demo, command({ dryRun: true }), store)).toEqual({
        outcome: 'success',
      });
      expect(started[0]?.dryRun).toBe(true);
    });
  });
});
