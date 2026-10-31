import type { PrismaClient } from '../generated/prisma/client';
import type { ScriptRunStore } from './run-script';

export const createPrismaScriptRunStore = (
  prisma: PrismaClient,
): ScriptRunStore => {
  const unimplemented = () =>
    Promise.reject(new Error(`not implemented ${typeof prisma}`));
  return { latest: unimplemented, start: unimplemented, finish: unimplemented };
};
