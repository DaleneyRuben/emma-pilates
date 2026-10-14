import { checkBackups, type StoredBackup } from './backup-check';
import { dailyBackupKey, monthlyBackupKey } from './backup-keys';

const day = 24 * 60 * 60 * 1_000;
// 03:00 in La Paz, the job's schedule.
const runAt = (date: string) => new Date(`${date}T07:00:00Z`);
const now = new Date('2026-10-14T12:00:00Z');

const daily = (at: Date, size = 300_000): StoredBackup => ({
  key: dailyBackupKey('emma', at),
  size,
  lastModified: new Date(at.getTime() + 60_000),
});
const monthly = (lastWrite: Date, size = 300_000): StoredBackup => ({
  key: monthlyBackupKey('emma', lastWrite),
  size,
  lastModified: new Date(lastWrite.getTime() + 60_000),
});

// What R2 holds after the job ran every day since `first`: one daily per run
// within the last 35 days, and each month's copy last written by its final
// run, kept for 365 days.
const healthyBucket = (first: Date, until: Date): StoredBackup[] => {
  const runs: Date[] = [];
  for (let at = first; at <= until; at = new Date(at.getTime() + day)) {
    runs.push(at);
  }
  const dailies = runs
    .filter((at) => until.getTime() - at.getTime() < 35 * day)
    .map((at) => daily(at));
  const lastOfMonth = new Map<string, Date>();
  runs.forEach((at) => lastOfMonth.set(monthlyBackupKey('emma', at), at));
  const monthlies = [...lastOfMonth.values()]
    .filter((at) => until.getTime() - at.getTime() < 365 * day)
    .map((at) => monthly(at));
  return [...dailies, ...monthlies];
};

const codes = (objects: StoredBackup[], at = now) =>
  checkBackups({ database: 'emma', objects, now: at }).problems.map(
    (problem) => problem.code,
  );

describe('backup check (EXT-009 retention)', () => {
  it('passes a bucket kept by the daily job and the two lifecycle rules', () => {
    const objects = healthyBucket(runAt('2025-06-01'), runAt('2026-10-14'));
    const report = checkBackups({ database: 'emma', objects, now });

    expect(report.problems).toEqual([]);
    expect(report.passed).toBe(true);
    expect(report.dailyCount).toBe(35);
    // Twelve complete months and the current one.
    expect(report.monthlyCount).toBe(13);
    expect(report.latestDaily).toEqual({
      key: 'daily/emma-20261014T070000Z.dump',
      size: 300_000,
      ageHours: 5,
    });
  });

  it('passes a young bucket that only lacks months before the first dump', () => {
    expect(
      codes(healthyBucket(runAt('2026-10-14'), runAt('2026-10-14'))),
    ).toEqual([]);
  });

  it('fails an empty bucket', () => {
    const report = checkBackups({ database: 'emma', objects: [], now });

    expect(report.passed).toBe(false);
    expect(report.problems.map((problem) => problem.code)).toEqual([
      'no_daily_dump',
    ]);
  });

  it('flags a latest dump older than a day and a missed run', () => {
    const objects = healthyBucket(runAt('2026-09-01'), runAt('2026-10-12'));

    expect(codes(objects)).toEqual(['latest_daily_stale', 'daily_missing']);
    expect(
      checkBackups({ database: 'emma', objects, now }).problems[1].detail,
    ).toBe('2026-10-13');
  });

  it('flags a dump less than half the size of the one before', () => {
    const objects = healthyBucket(runAt('2026-10-01'), runAt('2026-10-13'));
    objects.push(daily(runAt('2026-10-14'), 100_000));

    expect(codes(objects)).toEqual(['latest_daily_shrank']);
  });

  it('flags a day without a dump inside the 35-day window', () => {
    const objects = healthyBucket(runAt('2026-09-01'), runAt('2026-10-14'));
    const without = objects.filter(
      (object) => object.key !== 'daily/emma-20261002T070000Z.dump',
    );

    const report = checkBackups({ database: 'emma', objects: without, now });
    expect(report.problems).toEqual([
      { code: 'daily_missing', detail: '2026-10-02' },
    ]);
  });

  it('flags a month without its copy since the first dump', () => {
    const objects = healthyBucket(runAt('2026-07-01'), runAt('2026-10-14'));
    const without = objects.filter(
      (object) => object.key !== 'monthly/emma-2026-08.dump',
    );

    const report = checkBackups({ database: 'emma', objects: without, now });
    expect(report.problems).toEqual([
      { code: 'monthly_missing', detail: '2026-08' },
    ]);
  });

  it('flags dumps the lifecycle rules should already have deleted', () => {
    const objects = healthyBucket(runAt('2026-09-01'), runAt('2026-10-14'));
    objects.push(daily(runAt('2026-08-20')));
    objects.push(monthly(new Date('2025-09-30T07:00:00Z')));

    expect(codes(objects)).toEqual([
      'daily_kept_too_long',
      'monthly_kept_too_long',
    ]);
  });

  it('ignores other databases and keys the job never writes', () => {
    const objects = healthyBucket(runAt('2026-10-14'), runAt('2026-10-14'));
    objects.push({
      key: dailyBackupKey('pilates_dev_sim', runAt('2026-01-01')),
      size: 1,
      lastModified: runAt('2026-01-01'),
    });
    objects.push({ key: 'notes.txt', size: 1, lastModified: now });

    expect(codes(objects)).toEqual([]);
  });
});
