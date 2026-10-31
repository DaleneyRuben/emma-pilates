import type { DatabaseSettings } from '../database/database-clients';

export const validateScriptEnvironment = (
  values: Record<string, unknown>,
): DatabaseSettings => {
  throw new Error(`not implemented ${Object.keys(values).length}`);
};
