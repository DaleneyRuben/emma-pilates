import type { RowCounts } from './run-database-backup';

export const backupCountedTables = [
  'system.accounts',
  'booking.clients',
  'booking.payments',
  'booking.bookings',
  'system.audit_records',
] as const;

export const countBackupRows = (databaseUrl: string): Promise<RowCounts> =>
  Promise.reject(new Error(`not implemented: ${databaseUrl.length}`));
