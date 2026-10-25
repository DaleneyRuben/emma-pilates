import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';

// REL-012: «Enviar comentarios» from either app, triaged on the admin web
// (system-identity CONTEXT, Feedback). Google's production questionnaire asks
// what the testers said and what changed because of it.

export const feedbackTypes = ['problem', 'suggestion', 'other'] as const;
export const feedbackStatuses = ['new', 'reviewed', 'resolved'] as const;
export const feedbackApps = ['client', 'staff'] as const;
export const feedbackPlatforms = ['android', 'ios'] as const;
export type FeedbackType = (typeof feedbackTypes)[number];
export type FeedbackStatus = (typeof feedbackStatuses)[number];
export type FeedbackApp = (typeof feedbackApps)[number];
export type FeedbackPlatform = (typeof feedbackPlatforms)[number];
export type FeedbackRole =
  | 'client'
  | 'trainer'
  | 'assistant'
  | 'nutritionist'
  | 'administrator'
  | 'coordinator';

export const feedbackTextLength = { min: 10, max: 2_000 } as const;
export const feedbackNoteMaxLength = 2_000;
/** At most this many Feedback per Account in any 24 hours. */
export const feedbackDailyLimit = 10;
const feedbackWindowMilliseconds = 24 * 60 * 60 * 1_000;

export type FeedbackErrorCode =
  | 'invalid_feedback'
  | 'impersonation_forbidden'
  | 'feedback_limit_reached'
  | 'feedback_access_denied'
  | 'feedback_not_found'
  | 'idempotency_key_reused';

const statuses: Record<FeedbackErrorCode, number> = {
  invalid_feedback: 400,
  impersonation_forbidden: 403,
  feedback_limit_reached: 429,
  feedback_access_denied: 403,
  feedback_not_found: 404,
  idempotency_key_reused: 409,
};

export class FeedbackError extends Error {
  readonly status: number;

  constructor(readonly code: FeedbackErrorCode) {
    super(code);
    this.name = 'FeedbackError';
    this.status = statuses[code];
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

// The app and Role come from the signed-in Account, never from the request.
const sender = (
  principal: AuthenticatedPrincipal,
): { app: FeedbackApp; role: FeedbackRole } =>
  principal.identity.kind === 'client'
    ? { app: 'client', role: 'client' }
    : { app: 'staff', role: principal.identity.role };

// ADR-0054: triage is the Administrator's; the Coordinator may send feedback
// (operations) but cannot open the admin list (ADR-0102).
const requireAdministrator = (
  principal: AuthenticatedPrincipal,
): FeedbackActor => {
  if (
    principal.identity.kind !== 'staff' ||
    principal.identity.role !== 'administrator'
  ) {
    throw new FeedbackError('feedback_access_denied');
  }
  return {
    accountId: principal.accountId,
    staffMemberId: principal.identity.staffMemberId,
  };
};

export const sendFeedback = async (
  command: FeedbackMessage & { idempotencyKey: string },
  principal: AuthenticatedPrincipal,
  { store, now, newId }: Dependencies,
): Promise<{ id: string; createdAt: Date }> => {
  // ADR-0100: the Staff Member's own words, never an Administrator's.
  if (principal.impersonation !== undefined) {
    throw new FeedbackError('impersonation_forbidden');
  }
  const text = command.text.trim();
  if (
    text.length < feedbackTextLength.min ||
    text.length > feedbackTextLength.max
  ) {
    throw new FeedbackError('invalid_feedback');
  }
  const sentAt = now();
  return store.send({
    ...command,
    ...sender(principal),
    text,
    id: newId(),
    accountId: principal.accountId,
    sentAt,
    windowStartsAt: new Date(sentAt.getTime() - feedbackWindowMilliseconds),
    dailyLimit: feedbackDailyLimit,
  });
};

export const listFeedback = async (
  query: FeedbackListQuery,
  principal: AuthenticatedPrincipal,
  { store }: Dependencies,
): Promise<FeedbackPage> => {
  requireAdministrator(principal);
  return store.list(query);
};

// The export is the feedback log Google asks for; it leaves the system, so it
// is audited like the Promotion Contacts export.
export const exportFeedback = async (
  principal: AuthenticatedPrincipal,
  { store, now }: Dependencies,
): Promise<FeedbackRow[]> => {
  const actor = requireAdministrator(principal);
  const rows = await store.listAll();
  await store.recordExport({
    actor,
    feedbackCount: rows.length,
    occurredAt: now(),
  });
  return rows;
};

export const triageFeedback = async (
  command: {
    feedbackId: string;
    status: FeedbackStatus;
    changeNote: string | null;
  },
  principal: AuthenticatedPrincipal,
  { store, now }: Dependencies,
): Promise<FeedbackRow> => {
  const actor = requireAdministrator(principal);
  const note = command.changeNote?.trim() ?? '';
  if (note.length > feedbackNoteMaxLength) {
    throw new FeedbackError('invalid_feedback');
  }
  const row = await store.triage({
    feedbackId: command.feedbackId,
    status: command.status,
    changeNote: note === '' ? null : note,
    actor,
    occurredAt: now(),
  });
  if (row === null) throw new FeedbackError('feedback_not_found');
  return row;
};
