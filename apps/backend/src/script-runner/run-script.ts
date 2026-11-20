import type { PgBoss } from 'pg-boss';
import type { PrismaClient } from '../generated/prisma/client';
import type { ScriptCommand } from '../deployment/script-command';
import type { EncryptedAuthenticationLink } from '../system-identity/security/authentication-link-cipher';

// What a script needs to queue the Activation Link email the API queues:
// present only when the job carries the secret group's authentication keys.
export type ScriptAuthenticationEmail = {
  boss: Pick<PgBoss, 'send'>;
  digestEmail(email: string): Uint8Array;
  linkCipher: { encrypt: (secret: string) => EncryptedAuthenticationLink };
};

export type ScriptContext = {
  prisma: PrismaClient;
  params: Record<string, unknown>;
  dryRun: boolean;
  now: () => Date;
  log: (event: string, fields?: Record<string, unknown>) => void;
  authenticationEmail?: ScriptAuthenticationEmail;
};

export type ScriptDefinition = {
  requiredParams?: readonly string[];
  run(context: ScriptContext): Promise<void>;
};

export type ScriptRunRecord = {
  status: 'running' | 'success' | 'failure';
  startedAt: Date;
};

export type ScriptRunStore = {
  latest(scriptName: string): Promise<ScriptRunRecord | null>;
  start(input: {
    scriptName: string;
    params: Record<string, unknown>;
    dryRun: boolean;
    runUrl: string | null;
    startedAt: Date;
  }): Promise<string>;
  finish(
    id: string,
    outcome: {
      status: 'success' | 'failure';
      finishedAt: Date;
      errorMessage: string | null;
    },
  ): Promise<void>;
};

export type ScriptOutcome =
  | { outcome: 'success' }
  | { outcome: 'refused'; code: string; detail?: string }
  | { outcome: 'failed'; detail: string };

// A run still marked running after this long is taken as crashed.
const staleRunMs = 2 * 60 * 60 * 1_000;
const errorLimit = 500;

const describe = (error: unknown): string =>
  (error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error)
  ).slice(0, errorLimit);

// Like TurboTenant's script runner: a script that succeeded never runs again
// by accident, and one that is running blocks a second start. A dry run is
// recorded but never counts, and a forced run skips both checks.
const refusalOf = (
  latest: ScriptRunRecord | null,
  now: Date,
): string | undefined => {
  if (latest?.status === 'success') return 'already_succeeded';
  if (
    latest?.status === 'running' &&
    now.getTime() - latest.startedAt.getTime() < staleRunMs
  ) {
    return 'already_running';
  }
  return undefined;
};

export const runScript = async (input: {
  command: ScriptCommand;
  scripts: Record<string, ScriptDefinition>;
  store: ScriptRunStore;
  prisma: PrismaClient;
  now: () => Date;
  log: ScriptContext['log'];
  authenticationEmail?: ScriptAuthenticationEmail;
}): Promise<ScriptOutcome> => {
  const { command, store } = input;
  const script = Object.hasOwn(input.scripts, command.scriptName)
    ? input.scripts[command.scriptName]
    : undefined;
  if (script === undefined) {
    return { outcome: 'refused', code: 'script_unknown' };
  }
  const missing = (script.requiredParams ?? []).filter(
    (name) => !(name in command.params),
  );
  if (missing.length > 0) {
    return {
      outcome: 'refused',
      code: 'params_missing',
      detail: missing.join(', '),
    };
  }
  if (!command.dryRun && !command.forceRerun) {
    const refusal = refusalOf(
      await store.latest(command.scriptName),
      input.now(),
    );
    if (refusal !== undefined) return { outcome: 'refused', code: refusal };
  }

  const runId = await store.start({
    scriptName: command.scriptName,
    params: command.params,
    dryRun: command.dryRun,
    runUrl: command.runUrl,
    startedAt: input.now(),
  });
  try {
    await script.run({
      prisma: input.prisma,
      params: command.params,
      dryRun: command.dryRun,
      now: input.now,
      log: input.log,
      authenticationEmail: input.authenticationEmail,
    });
  } catch (error) {
    const detail = describe(error);
    await store.finish(runId, {
      status: 'failure',
      finishedAt: input.now(),
      errorMessage: detail,
    });
    return { outcome: 'failed', detail };
  }
  await store.finish(runId, {
    status: 'success',
    finishedAt: input.now(),
    errorMessage: null,
  });
  return { outcome: 'success' };
};
