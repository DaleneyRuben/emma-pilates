import type { ChildProcess, StdioOptions } from "node:child_process";
import { mkdirSync, openSync } from "node:fs";
import { join } from "node:path";

/** Alive until it exited by code or was ended by a signal. */
export const isRunning = (child: ChildProcess): boolean =>
  child.exitCode === null && child.signalCode === null;

/**
 * Asks the child to stop and waits for it, at most `graceMs`; a child that
 * ignores SIGTERM is killed, and the wait never outlives the grace period,
 * so a teardown cannot hang on a server that will not go.
 */
export const stopChild = (
  child: ChildProcess | undefined,
  graceMs = 5_000,
): Promise<void> =>
  new Promise<void>((done) => {
    if (child === undefined || !isRunning(child)) return done();
    const finish = () => {
      clearTimeout(timer);
      done();
    };
    const timer = setTimeout(() => {
      if (isRunning(child)) child.kill("SIGKILL");
      finish();
    }, graceMs);
    child.once("exit", finish);
    child.kill("SIGTERM");
  });

/**
 * Where a server's output goes: the terminal under E2E_DEBUG, otherwise its
 * stderr into `test-results/<name>.stderr.log`, so a startup crash can be
 * read after the run instead of vanishing with the process.
 */
export function serverStdio(root: string, name: string): StdioOptions {
  if (process.env.E2E_DEBUG !== undefined) return "inherit";
  const directory = join(root, "test-results");
  mkdirSync(directory, { recursive: true });
  return [
    "ignore",
    "ignore",
    openSync(join(directory, `${name}.stderr.log`), "w"),
  ];
}
