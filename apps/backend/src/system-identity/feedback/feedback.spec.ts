import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import {
  exportFeedback,
  FeedbackError,
  feedbackDailyLimit,
  listFeedback,
  sendFeedback,
  triageFeedback,
  type FeedbackRow,
  type FeedbackStore,
} from './feedback';

const now = new Date('2026-10-23T15:00:00.000Z');

const staff = (
  role: 'trainer' | 'assistant' | 'nutritionist' | 'administrator',
): AuthenticatedPrincipal => ({
  accountId: `${role}-account`,
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff',
    staffMemberId: `${role}-staff-member`,
    role,
    branchIds: [],
  },
});
const client: AuthenticatedPrincipal = {
  accountId: 'client-account',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client', clientId: 'client-id' },
};
const administrator = staff('administrator');
const impersonating: AuthenticatedPrincipal = {
  ...staff('trainer'),
  impersonation: {
    id: 'impersonation-id',
    administratorAccountId: 'administrator-account',
    staffMemberName: 'Camila Rojas',
    expiresAt: new Date('2026-10-23T15:20:00.000Z'),
  },
};

const message = {
  type: 'problem' as const,
  text: 'No puedo ver mis reservas de mañana.',
  appVersion: '1.0.1',
  appBuild: '3',
  platform: 'android' as const,
  osVersion: '14',
};

const row: FeedbackRow = {
  id: 'feedback-id',
  app: 'client',
  role: 'client',
  type: 'problem',
  text: message.text,
  appVersion: '1.0.1',
  appBuild: '3',
  platform: 'android',
  osVersion: '14',
  status: 'new',
  changeNote: null,
  senderEmail: 'valeria@example.com',
  createdAt: now,
  triagedAt: null,
};

const storeWith = (overrides: Partial<FeedbackStore> = {}): FeedbackStore => ({
  send: jest.fn().mockResolvedValue({ id: 'feedback-id', createdAt: now }),
  list: jest.fn().mockResolvedValue({
    items: [row],
    page: 1,
    pageSize: 20,
    totalItems: 1,
    newCount: 1,
  }),
  listAll: jest.fn().mockResolvedValue([row]),
  recordExport: jest.fn().mockResolvedValue(undefined),
  triage: jest.fn().mockResolvedValue({ ...row, status: 'resolved' }),
  ...overrides,
});

const dependencies = (store: FeedbackStore) => ({
  store,
  now: () => now,
  newId: () => 'feedback-id',
});

describe('sendFeedback (REL-012)', () => {
  it('attaches the app and Role of a Client and the rolling 24-hour limit', async () => {
    const store = storeWith();

    await expect(
      sendFeedback(
        { ...message, idempotencyKey: 'key' },
        client,
        dependencies(store),
      ),
    ).resolves.toEqual({ id: 'feedback-id', createdAt: now });
    expect(store.send).toHaveBeenCalledWith({
      ...message,
      id: 'feedback-id',
      accountId: 'client-account',
      app: 'client',
      role: 'client',
      idempotencyKey: 'key',
      sentAt: now,
      windowStartsAt: new Date('2026-10-22T15:00:00.000Z'),
      dailyLimit: 10,
    });
    expect(feedbackDailyLimit).toBe(10);
  });

  it.each(['trainer', 'assistant', 'nutritionist', 'administrator'] as const)(
    'sends a %s’s feedback from the Staff app with the Role',
    async (role) => {
      const store = storeWith();

      await sendFeedback(
        { ...message, idempotencyKey: 'key' },
        staff(role),
        dependencies(store),
      );
      expect(store.send).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: `${role}-account`,
          app: 'staff',
          role,
        }),
      );
    },
  );

  it('trims the text before storing it', async () => {
    const store = storeWith();

    await sendFeedback(
      { ...message, text: `  ${message.text}\n`, idempotencyKey: 'key' },
      client,
      dependencies(store),
    );
    expect(store.send).toHaveBeenCalledWith(
      expect.objectContaining({ text: message.text }),
    );
  });

  it.each([
    ['shorter than 10 characters', 'Muy mal  '],
    ['longer than 2,000 characters', 'a'.repeat(2_001)],
  ])('refuses a text %s', async (_label, text) => {
    const store = storeWith();

    await expect(
      sendFeedback(
        { ...message, text, idempotencyKey: 'key' },
        client,
        dependencies(store),
      ),
    ).rejects.toEqual(new FeedbackError('invalid_feedback'));
    expect(store.send).not.toHaveBeenCalled();
  });

  it('refuses while an Administrator sees the app as someone else', async () => {
    const store = storeWith();

    await expect(
      sendFeedback(
        { ...message, idempotencyKey: 'key' },
        impersonating,
        dependencies(store),
      ),
    ).rejects.toEqual(new FeedbackError('impersonation_forbidden'));
    expect(store.send).not.toHaveBeenCalled();
  });

  it('passes on the store’s refusal past the daily limit', async () => {
    const store = storeWith({
      send: jest
        .fn()
        .mockRejectedValue(new FeedbackError('feedback_limit_reached')),
    });

    await expect(
      sendFeedback(
        { ...message, idempotencyKey: 'key' },
        client,
        dependencies(store),
      ),
    ).rejects.toMatchObject({ code: 'feedback_limit_reached', status: 429 });
  });
});

describe('Feedback triage on the admin web (REL-012, ADR-0054)', () => {
  const others = [
    ['a Client', client],
    ['a Trainer', staff('trainer')],
    ['an Assistant', staff('assistant')],
    ['a Nutritionist', staff('nutritionist')],
  ] as const;

  it.each(others)('refuses %s every admin operation', async (_label, who) => {
    const store = storeWith();
    const denied = new FeedbackError('feedback_access_denied');

    await expect(
      listFeedback({ page: 1, pageSize: 20 }, who, dependencies(store)),
    ).rejects.toEqual(denied);
    await expect(exportFeedback(who, dependencies(store))).rejects.toEqual(
      denied,
    );
    await expect(
      triageFeedback(
        { feedbackId: 'feedback-id', status: 'reviewed', changeNote: null },
        who,
        dependencies(store),
      ),
    ).rejects.toEqual(denied);
    expect(store.list).not.toHaveBeenCalled();
    expect(store.listAll).not.toHaveBeenCalled();
    expect(store.triage).not.toHaveBeenCalled();
  });

  it('lists a page with the status and app filters', async () => {
    const store = storeWith();

    await expect(
      listFeedback(
        { page: 2, pageSize: 10, status: 'new', app: 'staff' },
        administrator,
        dependencies(store),
      ),
    ).resolves.toEqual({
      items: [row],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      newCount: 1,
    });
    expect(store.list).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      status: 'new',
      app: 'staff',
    });
  });

  it('exports every Feedback and records the export', async () => {
    const store = storeWith();

    await expect(
      exportFeedback(administrator, dependencies(store)),
    ).resolves.toEqual([row]);
    expect(store.recordExport).toHaveBeenCalledWith({
      actor: {
        accountId: 'administrator-account',
        staffMemberId: 'administrator-staff-member',
      },
      feedbackCount: 1,
      occurredAt: now,
    });
  });

  it('records the status and the trimmed note, an empty note as none', async () => {
    const store = storeWith();

    await triageFeedback(
      {
        feedbackId: 'feedback-id',
        status: 'resolved',
        changeNote: '  Arreglamos la lista de reservas en la 1.0.2.  ',
      },
      administrator,
      dependencies(store),
    );
    await triageFeedback(
      { feedbackId: 'feedback-id', status: 'reviewed', changeNote: '   ' },
      administrator,
      dependencies(store),
    );
    expect(store.triage).toHaveBeenNthCalledWith(1, {
      feedbackId: 'feedback-id',
      status: 'resolved',
      changeNote: 'Arreglamos la lista de reservas en la 1.0.2.',
      actor: {
        accountId: 'administrator-account',
        staffMemberId: 'administrator-staff-member',
      },
      occurredAt: now,
    });
    expect(store.triage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: 'reviewed', changeNote: null }),
    );
  });

  it('refuses a note longer than 2,000 characters', async () => {
    const store = storeWith();

    await expect(
      triageFeedback(
        {
          feedbackId: 'feedback-id',
          status: 'resolved',
          changeNote: 'a'.repeat(2_001),
        },
        administrator,
        dependencies(store),
      ),
    ).rejects.toEqual(new FeedbackError('invalid_feedback'));
  });

  it('answers not found for a missing Feedback', async () => {
    const store = storeWith({ triage: jest.fn().mockResolvedValue(null) });

    await expect(
      triageFeedback(
        { feedbackId: 'missing', status: 'reviewed', changeNote: null },
        administrator,
        dependencies(store),
      ),
    ).rejects.toMatchObject({ code: 'feedback_not_found', status: 404 });
  });
});
