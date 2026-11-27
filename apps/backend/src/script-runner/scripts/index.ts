import type { ScriptDefinition } from '../run-script';
import { androidTestStudio } from './android-test-studio';
import { storeReviewAccounts } from './store-review-accounts';
import { testersQuarterlyPlan } from './20261127-testers-quarterly-plan';

// The scripts this release carries, by the name the Run Script workflow
// takes. Like TurboTenant's runner, a name starts with the date it was
// written; a script stays here after it ran, as the record of what it did.
export const scripts: Record<string, ScriptDefinition> = {
  '20261031-store-review-accounts': storeReviewAccounts,
  '20261120-android-test-studio': androidTestStudio,
  '20261127-testers-quarterly-plan': testersQuarterlyPlan,
};
