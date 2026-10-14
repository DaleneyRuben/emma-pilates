import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { libpqEnvironment } from './libpq-environment';

export type ProcessRunner = (
  command: string,
  args: string[],
  env: Record<string, string>,
) => Promise<{ code: number; stderr: string }>;

// Enough of pg_dump's last lines to name the failure without flooding logs.
const stderrTailLength = 300;

export const spawnProcess: ProcessRunner = (command, args, env) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderr = (stderr + chunk).slice(-4 * stderrTailLength);
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, stderr }));
  });

// EXT-009: a custom-format dump (compressed, restorable with pg_restore and
// selectively), with no inherited PG* variables, waiting at most a minute for
// a lock a migration may hold; the job's retry runs it again.
export const createPgDump =
  (settings: {
    pgDumpPath: string;
    databaseUrl: string;
    directory: string;
    path: string;
    run: ProcessRunner;
  }): (() => Promise<string>) =>
  async () => {
    const environment = libpqEnvironment(
      settings.databaseUrl,
      'pilates-backup',
    );
    const file = join(settings.directory, `${environment.PGDATABASE}.dump`);
    const { code, stderr } = await settings.run(
      settings.pgDumpPath,
      [
        '--format=custom',
        '--no-password',
        '--lock-wait-timeout=60s',
        `--file=${file}`,
      ],
      { PATH: settings.path, ...environment },
    );
    if (code !== 0) {
      const tail = stderr.replace(/\s+/g, ' ').trim().slice(-stderrTailLength);
      throw new Error(`pg_dump exited with code ${code}: ${tail}`);
    }
    return file;
  };
