export type ProcessRunner = (
  command: string,
  args: string[],
  env: Record<string, string>,
) => Promise<{ code: number; stderr: string }>;

export const createPgDump =
  (settings: {
    pgDumpPath: string;
    databaseUrl: string;
    directory: string;
    path: string;
    run: ProcessRunner;
  }): (() => Promise<string>) =>
  () =>
    Promise.reject(new Error(`not implemented: ${settings.directory}`));
