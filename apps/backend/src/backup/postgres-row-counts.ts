import { Client } from 'pg';
import type { RowCounts } from './run-database-backup';

// The tables the restore drill compares (runbook step 7). Rows are never
// deleted (ADR-0086), so counts taken just before the dump are a floor for
// what the restored copy must hold.
export const backupCountedTables = [
  'system.accounts',
  'booking.clients',
  'booking.payments',
  'booking.bookings',
  'system.audit_records',
] as const;

const countQuery = `select ${backupCountedTables
  .map((table) => `(select count(*) from ${table}) as "${table}"`)
  .join(', ')}`;

export const countBackupRows = async (
  databaseUrl: string,
): Promise<RowCounts> => {
  const client = new Client({
    connectionString: databaseUrl,
    application_name: 'pilates-backup',
  });
  await client.connect();
  try {
    const { rows } = await client.query<Record<string, string>>(countQuery);
    return Object.fromEntries(
      backupCountedTables.map((table) => [table, Number(rows[0][table])]),
    );
  } finally {
    await client.end();
  }
};
