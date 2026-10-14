import {
  dailyBackupKey,
  monthlyBackupKey,
  parseBackupKey,
} from './backup-keys';

describe('backup keys (EXT-009)', () => {
  const at = new Date('2026-10-14T07:00:12.345Z');

  it('names a daily dump by its UTC start time, to the second', () => {
    expect(dailyBackupKey('emma', at)).toBe('daily/emma-20261014T070012Z.dump');
  });

  // The job overwrites the month's copy every day, so the last dump of each
  // La Paz month is the one that stays.
  it('names the monthly copy by the month in La Paz', () => {
    expect(monthlyBackupKey('emma', at)).toBe('monthly/emma-2026-10.dump');
    expect(monthlyBackupKey('emma', new Date('2026-11-01T03:59:59Z'))).toBe(
      'monthly/emma-2026-10.dump',
    );
    expect(monthlyBackupKey('emma', new Date('2026-11-01T04:00:00Z'))).toBe(
      'monthly/emma-2026-11.dump',
    );
  });

  it('reads the kind, database, and time back from a key', () => {
    expect(parseBackupKey('daily/emma-20261014T070012Z.dump')).toEqual({
      kind: 'daily',
      database: 'emma',
      at: new Date('2026-10-14T07:00:12Z'),
    });
    expect(parseBackupKey('monthly/pilates_dev_sim-2026-10.dump')).toEqual({
      kind: 'monthly',
      database: 'pilates_dev_sim',
      month: '2026-10',
    });
  });

  it('ignores keys the job never writes', () => {
    expect(parseBackupKey('daily/emma-2026-10-14.dump')).toBeNull();
    expect(parseBackupKey('weekly/emma-2026-10.dump')).toBeNull();
    expect(parseBackupKey('notes.txt')).toBeNull();
  });
});
