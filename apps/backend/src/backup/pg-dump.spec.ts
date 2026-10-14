import { createPgDump } from './pg-dump';

const databaseUrl =
  'postgresql://avnadmin:secret@db.example.aivencloud.com:20680/emma' +
  '?sslmode=verify-full&sslrootcert=/etc/secrets/emma-ca.pem' +
  '&sslcert=/etc/secrets/emma-ca.pem&sslaccept=strict';

describe('createPgDump (EXT-009)', () => {
  it('writes a custom-format dump into the work directory with libpq settings only', async () => {
    const run = jest.fn(() => Promise.resolve({ code: 0, stderr: '' }));
    const dump = createPgDump({
      pgDumpPath: '/usr/lib/postgresql/18/bin/pg_dump',
      databaseUrl,
      directory: '/tmp/backup-abc',
      path: '/usr/bin:/bin',
      run,
    });

    await expect(dump()).resolves.toBe('/tmp/backup-abc/emma.dump');

    expect(run).toHaveBeenCalledWith(
      '/usr/lib/postgresql/18/bin/pg_dump',
      [
        '--format=custom',
        '--no-password',
        '--lock-wait-timeout=60s',
        '--file=/tmp/backup-abc/emma.dump',
      ],
      {
        PATH: '/usr/bin:/bin',
        PGHOST: 'db.example.aivencloud.com',
        PGPORT: '20680',
        PGUSER: 'avnadmin',
        PGPASSWORD: 'secret',
        PGDATABASE: 'emma',
        PGAPPNAME: 'pilates-backup',
        PGSSLMODE: 'verify-full',
        PGSSLROOTCERT: '/etc/secrets/emma-ca.pem',
      },
    );
  });

  // The password travels only in the environment, never in the arguments
  // that a process listing or an error message could show.
  it('keeps the password out of the arguments', async () => {
    const run = jest.fn(() => Promise.resolve({ code: 0, stderr: '' }));

    await createPgDump({
      pgDumpPath: 'pg_dump',
      databaseUrl,
      directory: '/tmp/backup-abc',
      path: '',
      run,
    })();

    expect(JSON.stringify(run.mock.calls[0][1])).not.toContain('secret');
  });

  it('fails with the exit code and the end of pg_dump’s error output', async () => {
    const stderr = `${'x'.repeat(600)}\npg_dump: error: server version: 18.6; pg_dump version: 17.6\n`;
    const run = jest.fn(() => Promise.resolve({ code: 1, stderr }));

    const dump = createPgDump({
      pgDumpPath: 'pg_dump',
      databaseUrl,
      directory: '/tmp/backup-abc',
      path: '',
      run,
    });

    await expect(dump()).rejects.toThrow(
      /^pg_dump exited with code 1: .*server version: 18\.6; pg_dump version: 17\.6$/,
    );
    await expect(dump()).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringMatching(/^.{0,330}$/s) as string,
      }) as Error,
    );
  });
});
