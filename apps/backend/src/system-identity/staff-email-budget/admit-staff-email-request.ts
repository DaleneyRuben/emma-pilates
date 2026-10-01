import {
  staffEmailDayMilliseconds,
  type StaffEmailPurpose,
  staffEmailWaitSeconds,
} from './staff-email-budget-policy';

export class StaffEmailThrottledError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('Too many emails were requested from this Account');
  }
}

export type StaffEmailBudgetGateway = {
  /**
   * Reads the Account's events, asks `waitSeconds`, and records one more
   * event when the wait is 0, atomically. Answers the wait.
   */
  admit(input: {
    accountId: string;
    purpose: StaffEmailPurpose;
    now: Date;
    expiresAt: Date;
    waitSeconds: (occurredAt: readonly Date[]) => number;
  }): Promise<number>;
};

type AdmitStaffEmailRequestDependencies = {
  gateway: StaffEmailBudgetGateway;
  now(): Date;
};

/**
 * BE-013: every authenticated request the Account budget admits counts,
 * whatever the use case then does; a refused request counts nothing.
 */
export const admitStaffEmailRequest = async (
  command: { accountId: string; purpose: StaffEmailPurpose },
  dependencies: AdmitStaffEmailRequestDependencies,
): Promise<void> => {
  const now = dependencies.now();
  const wait = await dependencies.gateway.admit({
    ...command,
    now,
    expiresAt: new Date(now.getTime() + staffEmailDayMilliseconds),
    waitSeconds: (occurredAt) => staffEmailWaitSeconds(occurredAt, now),
  });

  if (wait > 0) {
    throw new StaffEmailThrottledError(wait);
  }
};
