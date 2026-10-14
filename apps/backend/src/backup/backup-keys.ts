import { boliviaMonth } from '../time/bolivia-time';

export type ParsedBackupKey =
  | { kind: 'daily'; database: string; at: Date }
  | { kind: 'monthly'; database: string; month: string };

const dailyPattern =
  /^daily\/([a-z0-9_]+)-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z\.dump$/;
const monthlyPattern = /^monthly\/([a-z0-9_]+)-(\d{4}-\d{2})\.dump$/;

// Daily keys are unique to the second, so a retried run never collides with
// an earlier upload; R2's lifecycle rules expire `daily/` and `monthly/` by
// age (EXT-009).
export const dailyBackupKey = (database: string, at: Date): string => {
  const stamp = at
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[-:]/g, '');
  return `daily/${database}-${stamp}.dump`;
};

export const monthlyBackupKey = (database: string, at: Date): string =>
  `monthly/${database}-${boliviaMonth(at).toISOString().slice(0, 7)}.dump`;

export const parseBackupKey = (key: string): ParsedBackupKey | null => {
  const daily = dailyPattern.exec(key);
  if (daily !== null) {
    const [, database, year, month, day, hour, minute, second] = daily;
    return {
      kind: 'daily',
      database,
      at: new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`),
    };
  }
  const monthly = monthlyPattern.exec(key);
  return monthly === null
    ? null
    : { kind: 'monthly', database: monthly[1], month: monthly[2] };
};
