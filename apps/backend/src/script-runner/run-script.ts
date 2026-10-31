import type { PrismaClient } from '../generated/prisma/client';
import type { ScriptCommand } from './script-command';

export type ScriptContext = {
  prisma: PrismaClient;
  params: Record<string, unknown>;
  dryRun: boolean;
  now: () => Date;
  log: (event: string, fields?: Record<string, unknown>) => void;
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

export const runScript = (input: {
  command: ScriptCommand;
  scripts: Record<string, ScriptDefinition>;
  store: ScriptRunStore;
  prisma: PrismaClient;
  now: () => Date;
  log: ScriptContext['log'];
}): Promise<ScriptOutcome> =>
  Promise.reject(new Error(`not implemented ${input.command.scriptName}`));
