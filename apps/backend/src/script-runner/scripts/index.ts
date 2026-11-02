import type { ScriptDefinition } from '../run-script';
import { storeReviewAccounts } from './store-review-accounts';

// The scripts this release carries, by the name the Run Script workflow
// takes. Like TurboTenant's runner, a name starts with the date it was
// written; a script stays here after it ran, as the record of what it did.
export const scripts: Record<string, ScriptDefinition> = {
  '20261031-store-review-accounts': storeReviewAccounts,
};
