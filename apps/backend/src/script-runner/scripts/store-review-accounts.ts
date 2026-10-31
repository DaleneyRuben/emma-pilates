import type { ScriptDefinition } from '../run-script';

export const storeReviewAccounts: ScriptDefinition = {
  requiredParams: ['clientEmail', 'trainerEmail'],
  run: (context) =>
    Promise.reject(new Error(`not implemented ${String(context.dryRun)}`)),
};
