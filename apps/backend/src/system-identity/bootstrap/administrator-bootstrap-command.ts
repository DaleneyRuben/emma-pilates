import { z } from 'zod';
import {
  AdministratorAlreadyActiveError,
  BootstrapEmailInUseError,
  BootstrapEmailThrottledError,
  BootstrapPendingForAnotherEmailError,
  type BootstrapAdministratorResult,
} from './bootstrap-first-administrator';

const configurationSchema = z.object({
  BOOTSTRAP_ADMINISTRATOR_EMAIL: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email()),
  BOOTSTRAP_ADMINISTRATOR_NAME: z.string().trim().min(1).max(120),
});

export type AdministratorBootstrapReport =
  | {
      event: 'administrator_bootstrap_completed';
      status: BootstrapAdministratorResult['status'];
      accountId: string;
      staffMemberId: string;
      activationExpiresAt: string;
    }
  | {
      event: 'administrator_bootstrap_invalid_configuration';
      fields: string[];
    }
  | { event: 'administrator_bootstrap_refused'; reason: string };

const refusalReason = (error: unknown): string | null => {
  if (error instanceof AdministratorAlreadyActiveError) {
    return 'administrator_already_active';
  }
  if (error instanceof BootstrapPendingForAnotherEmailError) {
    return 'bootstrap_pending_for_another_email';
  }
  if (error instanceof BootstrapEmailInUseError) return 'email_in_use';
  if (error instanceof BootstrapEmailThrottledError) return 'email_throttled';
  return null;
};

// ADR-0083: run deliberately from the deployment image, never at startup.
// Returns the process exit code; reports never carry the email address.
export const runAdministratorBootstrapCommand = async (
  values: Record<string, unknown>,
  dependencies: {
    bootstrap: (command: {
      email: string;
      name: string;
    }) => Promise<BootstrapAdministratorResult>;
    report: (report: AdministratorBootstrapReport) => void;
  },
): Promise<number> => {
  const configuration = configurationSchema.safeParse(values);
  if (!configuration.success) {
    dependencies.report({
      event: 'administrator_bootstrap_invalid_configuration',
      fields: [
        ...new Set(
          configuration.error.issues.map((issue) => String(issue.path[0])),
        ),
      ].sort(),
    });
    return 1;
  }

  try {
    const result = await dependencies.bootstrap({
      email: configuration.data.BOOTSTRAP_ADMINISTRATOR_EMAIL,
      name: configuration.data.BOOTSTRAP_ADMINISTRATOR_NAME,
    });
    dependencies.report({
      event: 'administrator_bootstrap_completed',
      status: result.status,
      accountId: result.accountId,
      staffMemberId: result.staffMemberId,
      activationExpiresAt: result.activationExpiresAt.toISOString(),
    });
    return 0;
  } catch (error) {
    const reason = refusalReason(error);
    if (reason === null) throw error;
    dependencies.report({ event: 'administrator_bootstrap_refused', reason });
    return 1;
  }
};
