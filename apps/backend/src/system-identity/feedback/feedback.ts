import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';

export const feedbackTypes = ['problem', 'suggestion', 'other'] as const;
export const feedbackStatuses = ['new', 'reviewed', 'resolved'] as const;
export const feedbackApps = ['client', 'staff'] as const;
export const feedbackPlatforms = ['android', 'ios'] as const;
export type FeedbackType = (typeof feedbackTypes)[number];
export type FeedbackStatus = (typeof feedbackStatuses)[number];
export type FeedbackApp = (typeof feedbackApps)[number];
export type FeedbackPlatform = (typeof feedbackPlatforms)[number];
export type FeedbackRole =
  'client' | 'trainer' | 'assistant' | 'nutritionist' | 'administrator';

export const feedbackDailyLimit = 0;

export type FeedbackErrorCode =
  | 'invalid_feedback'
  | 'impersonation_forbidden'
  | 'feedback_limit_reached'
  | 'feedback_access_denied'
  | 'feedback_not_found'
  | 'idempotency_key_reused';

export class FeedbackError extends Error {
  readonly status = 500;

  constructor(readonly code: FeedbackErrorCode) {
    super(code);
  }
}

export type FeedbackMessage = {
  type: FeedbackType;
  text: string;
  appVersion: string;
  appBuild: string;
  platform: FeedbackPlatform;
  osVersion: string;
};

export type FeedbackRow = FeedbackMessage & {
  id: string;
  app: FeedbackApp;
  role: FeedbackRole;
  status: FeedbackStatus;
  changeNote: string | null;
  senderEmail: string;
  createdAt: Date;
  triagedAt: Date | null;
};

export type FeedbackPage = {
  items: FeedbackRow[];
  page: number;
  pageSize: number;
  totalItems: number;
  newCount: number;
};

export type FeedbackListQuery = {
  page: number;
  pageSize: number;
  status?: FeedbackStatus;
  app?: FeedbackApp;
};

export type FeedbackActor = { accountId: string; staffMemberId: string };

export interface FeedbackStore {
  send: (
    input: FeedbackMessage & {
      id: string;
      accountId: string;
      app: FeedbackApp;
      role: FeedbackRole;
      idempotencyKey: string;
      sentAt: Date;
      windowStartsAt: Date;
      dailyLimit: number;
    },
  ) => Promise<{ id: string; createdAt: Date }>;
  list: (query: FeedbackListQuery) => Promise<FeedbackPage>;
  listAll: () => Promise<FeedbackRow[]>;
  recordExport: (input: {
    actor: FeedbackActor;
    feedbackCount: number;
    occurredAt: Date;
  }) => Promise<void>;
  triage: (input: {
    feedbackId: string;
    status: FeedbackStatus;
    changeNote: string | null;
    actor: FeedbackActor;
    occurredAt: Date;
  }) => Promise<FeedbackRow | null>;
}

type Dependencies = {
  store: FeedbackStore;
  now: () => Date;
  newId: () => string;
};

const notImplemented = (): Promise<never> =>
  Promise.reject(new Error('not implemented'));

export const sendFeedback: (
  command: FeedbackMessage & { idempotencyKey: string },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<{ id: string; createdAt: Date }> = notImplemented;

export const listFeedback: (
  query: FeedbackListQuery,
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<FeedbackPage> = notImplemented;

export const exportFeedback: (
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<FeedbackRow[]> = notImplemented;

export const triageFeedback: (
  command: {
    feedbackId: string;
    status: FeedbackStatus;
    changeNote: string | null;
  },
  principal: AuthenticatedPrincipal,
  dependencies: Dependencies,
) => Promise<FeedbackRow> = notImplemented;
