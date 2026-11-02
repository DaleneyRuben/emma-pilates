import { z } from 'zod';
import type { DatabaseSettings } from '../database/database-clients';

// REL-016: a script runs as a run of the migrate job, which carries the
// environment's secret group but not the API's service variables (such as
// AUTHENTICATION_LINK_BASE_URL), so the runner checks only the database it
// uses, like the backup job does. Two connections are enough for one script.
const scriptEnvironmentSchema = z.object({
  DATABASE_URL: z
    .url()
    .refine(
      (value) =>
        value.startsWith('postgresql://') || value.startsWith('postgres://'),
      'DATABASE_URL must use the PostgreSQL protocol',
    ),
  DATABASE_POOL_MAX: z.coerce.number().int().min(2).max(20).default(2),
});

export const validateScriptEnvironment = (
  values: Record<string, unknown>,
): DatabaseSettings => scriptEnvironmentSchema.parse(values);
