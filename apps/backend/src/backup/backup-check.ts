import { addCivilDays, boliviaDate } from '../time/bolivia-time';
import { parseBackupKey } from './backup-keys';

export type StoredBackup = { key: string; size: number; lastModified: Date };

export type BackupProblem = { code: string; detail?: string };

export type BackupCheckReport = {
  passed: boolean;
  dailyCount: number;
  monthlyCount: number;
  latestDaily: { key: string; size: number; ageHours: number } | null;
  problems: BackupProblem[];
};

const hour = 60 * 60 * 1_000;
const day = 24 * hour;
// The R2 lifecycle rules (runbook): `daily/` after 35 days, `monthly/` after
// 365. R2 applies a rule within about a day, so two days of slack.
const dailyDays = 35;
const monthlyDays = 365;
const lifecycleSlackMs = 2 * day;
// The job runs once a day; a little more than a day allows for a slow run.
const staleAfterHours = 26;

const civilDay = (at: Date): string =>
  boliviaDate(at).toISOString().slice(0, 10);

const monthsBetween = (first: string, last: string): string[] => {
  const months: string[] = [];
  const cursor = new Date(`${first}-01T00:00:00Z`);
  const end = new Date(`${last}-01T00:00:00Z`);
  while (cursor <= end) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
};

// The weekly check (runbook): R2 keeps the dumps by age alone, so this reads
// the bucket's listing and says whether it holds what the retention promises.
// Objects past their rule are reported and left out of the other checks.
export const checkBackups = (input: {
  database: string;
  objects: StoredBackup[];
  now: Date;
}): BackupCheckReport => {
  const { now } = input;
  const age = (object: StoredBackup) =>
    now.getTime() - object.lastModified.getTime();
  const parsed = input.objects.flatMap((object) => {
    const key = parseBackupKey(object.key);
    return key === null || key.database !== input.database
      ? []
      : [{ object, key }];
  });

  const tooOld: BackupProblem[] = [];
  const kept = parsed.filter(({ object, key }) => {
    const limitDays = key.kind === 'daily' ? dailyDays : monthlyDays;
    if (age(object) <= limitDays * day + lifecycleSlackMs) return true;
    tooOld.push({ code: `${key.kind}_kept_too_long`, detail: object.key });
    return false;
  });

  const dailies = kept
    .flatMap(({ object, key }) =>
      key.kind === 'daily' ? [{ object, at: key.at }] : [],
    )
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  const months = new Set(
    kept.flatMap(({ key }) => (key.kind === 'monthly' ? [key.month] : [])),
  );

  const problems: BackupProblem[] = [];
  const latest = dailies.at(-1);
  const latestDaily =
    latest === undefined
      ? null
      : {
          key: latest.object.key,
          size: latest.object.size,
          ageHours: Math.floor((now.getTime() - latest.at.getTime()) / hour),
        };

  if (latest === undefined || latestDaily === null) {
    problems.push({ code: 'no_daily_dump' });
  } else {
    if (latestDaily.ageHours > staleAfterHours) {
      problems.push({ code: 'latest_daily_stale', detail: latest.object.key });
    }
    const previous = dailies.at(-2);
    if (
      previous !== undefined &&
      latest.object.size * 2 < previous.object.size
    ) {
      problems.push({ code: 'latest_daily_shrank', detail: latest.object.key });
    }

    // Every La Paz day from the first kept dump (at most 35 days back) up to
    // yesterday has one; today's run is what the staleness check covers.
    const today = boliviaDate(now);
    const windowStart = addCivilDays(today, -(dailyDays - 1));
    const first = boliviaDate(dailies[0].at);
    const covered = new Set(dailies.map(({ at }) => civilDay(at)));
    for (
      let date = first > windowStart ? first : windowStart;
      date < today;
      date = addCivilDays(date, 1)
    ) {
      const name = date.toISOString().slice(0, 10);
      if (!covered.has(name)) {
        problems.push({ code: 'daily_missing', detail: name });
      }
    }
  }

  // Every month from the first dump (at most twelve back) to this one has its
  // copy.
  const currentMonth = civilDay(now).slice(0, 7);
  const earliest = [
    ...months,
    ...dailies.map(({ at }) => civilDay(at).slice(0, 7)),
  ].sort()[0];
  if (earliest !== undefined) {
    const oldestKept = new Date(`${currentMonth}-01T00:00:00Z`);
    oldestKept.setUTCMonth(oldestKept.getUTCMonth() - 12);
    const floor = oldestKept.toISOString().slice(0, 7);
    monthsBetween(earliest > floor ? earliest : floor, currentMonth)
      .filter((month) => !months.has(month))
      .forEach((month) =>
        problems.push({ code: 'monthly_missing', detail: month }),
      );
  }

  problems.push(...tooOld);
  return {
    passed: problems.length === 0,
    dailyCount: dailies.length,
    monthlyCount: months.size,
    latestDaily,
    problems,
  };
};
