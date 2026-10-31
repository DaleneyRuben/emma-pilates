import { fakeClock } from './backend-release-test-support';
import type { NorthflankClient, NorthflankRun } from './northflank-client';
import { dispatchScript } from './script-dispatch';

const run = (status: string, concluded: boolean): NorthflankRun => ({
  id: 'run-9',
  runName: 'migrate-9',
  status,
  concluded,
});

const fakeNorthflank = (
  answers: (NorthflankRun | Error)[],
  recent: NorthflankRun[] = [run('SUCCESS', true)],
) => {
  const started: unknown[][] = [];
  let polls = 0;
  const northflank = {
    listJobRuns: () => Promise.resolve(recent),
    startJobRun: (...args: unknown[]) => {
      started.push(args);
      return Promise.resolve({ id: 'run-9', runName: 'migrate-9' });
    },
    getJobRun: () => {
      const answer = answers[Math.min(polls, answers.length - 1)];
      polls += 1;
      return answer instanceof Error
        ? Promise.reject(answer)
        : Promise.resolve(answer);
    },
  } as unknown as NorthflankClient;
  return { northflank, started, polls: () => polls };
};

const command = {
  scriptName: '20261031-store-review-accounts',
  params: { clientEmail: 'revision-play@emmapilatesstudio.com' },
  dryRun: true,
  forceRerun: false,
  runUrl: 'https://github.com/DaleneyRuben/emma-pilates/actions/runs/5',
};

const dispatch = (northflank: NorthflankClient) =>
  dispatchScript({
    northflank,
    clock: fakeClock(),
    jobId: 'migrate',
    command,
    log: () => undefined,
  });

describe('dispatching a Run Script to Northflank (REL-016)', () => {
  it('runs the migrate job with the script command and waits for success', async () => {
    const fake = fakeNorthflank([
      run('RUNNING', false),
      run('RUNNING', false),
      run('SUCCESS', true),
    ]);

    expect(await dispatch(fake.northflank)).toEqual({
      outcome: 'succeeded',
      runName: 'migrate-9',
    });
    expect(fake.started).toEqual([
      [
        'migrate',
        {
          customCommand: expect.stringMatching(
            /^node dist\/src\/script-runner-main\.js 20261031-store-review-accounts --params \S+ --dry-run --run-url https:\/\/github\.com\/DaleneyRuben\/emma-pilates\/actions\/runs\/5$/,
          ) as string,
        },
      ],
    ]);
    expect(fake.polls()).toBe(3);
  });

  // A release migrates through the same job, and a script must never run
  // beside it (REL-016 review).
  it('starts nothing while the migrate job is still running', async () => {
    const fake = fakeNorthflank([], [run('RUNNING', false)]);

    expect(await dispatch(fake.northflank)).toEqual({
      outcome: 'failed',
      runName: 'migrate-9',
      detail:
        'migrate-9 is still RUNNING; run the script again once it has ended',
    });
    expect(fake.started).toEqual([]);
  });

  it('reports a run that ended without success', async () => {
    const fake = fakeNorthflank([run('FAILED', true)]);

    expect(await dispatch(fake.northflank)).toEqual({
      outcome: 'failed',
      runName: 'migrate-9',
      detail: 'migrate-9 ended FAILED; its log in Northflank says why',
    });
  });

  it('stops waiting after thirty minutes', async () => {
    const fake = fakeNorthflank([run('RUNNING', false)]);

    expect(await dispatch(fake.northflank)).toEqual({
      outcome: 'failed',
      runName: 'migrate-9',
      detail: 'migrate-9 is still RUNNING after 30 minutes',
    });
  });

  it('rides out a few network failures while it waits', async () => {
    const fake = fakeNorthflank([
      new TypeError('fetch failed'),
      new TypeError('fetch failed'),
      run('SUCCESS', true),
    ]);

    expect((await dispatch(fake.northflank)).outcome).toBe('succeeded');
  });
});
