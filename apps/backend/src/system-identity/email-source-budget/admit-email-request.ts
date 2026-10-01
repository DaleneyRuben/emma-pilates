import { type RequestSource, sourceDigests } from '../security/request-source';
import {
  type EmailBudgetGroup,
  emailSourceDayMilliseconds,
  type EmailSourceEvents,
  emailSourceWaitSeconds,
} from './email-source-budget-policy';

export class EmailSourceThrottledError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('Too many requests from this device or network');
  }
}

export type EmailSourceBudgetGateway = {
  /**
   * Reads the source's events, asks `waitSeconds`, and records one more event
   * when the wait is 0, atomically. Answers the wait.
   */
  admit(input: {
    group: EmailBudgetGroup;
    clientDigest: Uint8Array | null;
    networkDigest: Uint8Array;
    now: Date;
    expiresAt: Date;
    waitSeconds: (events: EmailSourceEvents) => number;
  }): Promise<number>;
};

type AdmitEmailRequestDependencies = {
  gateway: EmailSourceBudgetGateway;
  digestSignal: (value: string) => Uint8Array;
  now(): Date;
};

/**
 * BE-012: every request admitted by the client and network lanes counts,
 * whatever the use case then does, so the budgets reveal nothing about an
 * address; a refused request counts nothing.
 */
export const admitEmailRequest = async (
  command: RequestSource & { group: EmailBudgetGroup },
  dependencies: AdmitEmailRequestDependencies,
): Promise<void> => {
  const now = dependencies.now();
  const wait = await dependencies.gateway.admit({
    group: command.group,
    ...sourceDigests(command, dependencies.digestSignal),
    now,
    expiresAt: new Date(now.getTime() + emailSourceDayMilliseconds),
    waitSeconds: (events) => emailSourceWaitSeconds(command.group, events, now),
  });

  if (wait > 0) {
    throw new EmailSourceThrottledError(wait);
  }
};
