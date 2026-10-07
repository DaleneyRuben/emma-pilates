import pg from 'pg';

// Spawned detached by database-test-context.ts for each disposable database
// and run by Node directly (type stripping), outside Jest and outside the
// terminal's process group, so Ctrl-C does not reach it. It only ever drops
// the one generated name it was given.

const adminUrl = process.env.WATCHDOG_ADMIN_URL ?? '';
const name = process.env.WATCHDOG_DATABASE ?? '';
let input = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk: string) => {
  input += chunk;
});
process.stdin.on('end', () => {
  if (input === 'release' || !/^pilates_test_[0-9a-f]{12}$/.test(name)) return;
  const admin = new pg.Client({ connectionString: adminUrl });
  void admin
    .connect()
    .then(() => admin.query(`drop database if exists "${name}" with (force)`))
    .finally(() => admin.end());
});
