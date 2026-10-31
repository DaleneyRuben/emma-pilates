import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '../generated/prisma/client';
import type { ScriptRunRecord, ScriptRunStore } from './run-script';

const statuses = new Set<ScriptRunRecord['status']>([
  'running',
  'success',
  'failure',
]);

export const createPrismaScriptRunStore = (
  prisma: PrismaClient,
): ScriptRunStore => ({
  latest: async (scriptName) => {
    const row = await prisma.scriptRun.findFirst({
      where: { scriptName, dryRun: false, deletedAt: null },
      orderBy: [{ startedAt: 'desc' }, { createdAt: 'desc' }],
      select: { status: true, startedAt: true },
    });
    if (row === null) return null;
    const status = row.status as ScriptRunRecord['status'];
    if (!statuses.has(status)) {
      throw new Error(`script run status ${row.status} is unknown`);
    }
    return { status, startedAt: row.startedAt };
  },
  start: async (input) => {
    const row = await prisma.scriptRun.create({
      data: {
        id: randomUUID(),
        scriptName: input.scriptName,
        status: 'running',
        params: input.params as Prisma.InputJsonObject,
        dryRun: input.dryRun,
        runUrl: input.runUrl,
        startedAt: input.startedAt,
      },
      select: { id: true },
    });
    return row.id;
  },
  finish: async (id, outcome) => {
    await prisma.scriptRun.update({
      where: { id },
      data: {
        status: outcome.status,
        finishedAt: outcome.finishedAt,
        errorMessage: outcome.errorMessage,
      },
    });
  },
});
