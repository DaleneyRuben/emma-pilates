import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  AccountClosureError,
  closeClientAccount,
  type ClosureDependencies,
  type ClosureTransaction,
} from './close-client-account';

const now = new Date('2026-09-28T15:00:00.000Z');

const client: AuthenticatedPrincipal = {
  accountId: 'client-account',
  authenticationSessionId: 'authentication-session',
  identity: { kind: 'client', clientId: 'client-1' },
};
const staff = (
  role: 'assistant' | 'administrator' | 'trainer' | 'nutritionist',
): AuthenticatedPrincipal => ({
  accountId: 'staff-account',
  authenticationSessionId: 'authentication-session',
  identity: {
    kind: 'staff',
    staffMemberId: 'staff-1',
    role,
    branchIds: [],
  },
});

type Fake = {
  calls: string[];
  audit: Parameters<ClosureTransaction['recordAudit']>[0][];
  transaction: ClosureTransaction;
};

const fakeTransaction = (overrides: Partial<ClosureTransaction> = {}): Fake => {
  const calls: string[] = [];
  const audit: Fake['audit'] = [];
  const record =
    <Result>(name: string, result: Result) =>
    () => {
      calls.push(name);
      return Promise.resolve(result);
    };
  const transaction: ClosureTransaction = {
    lockClient: record('lockClient', {
      clientId: 'client-1',
      accountId: 'client-account',
    }),
    hasPendingTransferPayment: record('hasPendingTransferPayment', false),
    closeWaitlistEntries: record('closeWaitlistEntries', 2),
    cancelFutureBookings: record('cancelFutureBookings', {
      count: 3,
      sessionIds: ['session-1', 'session-2'],
    }),
    cancelFutureEvaluations: record('cancelFutureEvaluations', 1),
    releaseOpenPurchaseIntent: record('releaseOpenPurchaseIntent', true),
    endSubscription: record('endSubscription', { forfeitedClasses: 4 }),
    promoteWaitlists: record('promoteWaitlists', undefined),
    endPromotionsConsent: record('endPromotionsConsent', null),
    keepPromotionContact: record('keepPromotionContact', undefined),
    closeAccount: record('closeAccount', undefined),
    removeClient: record('removeClient', undefined),
    recordAudit: (entry) => {
      calls.push('recordAudit');
      audit.push(entry);
      return Promise.resolve();
    },
    ...overrides,
  };
  return { calls, audit, transaction };
};

const setup = (fake: Fake, options: { passwordMatches?: boolean } = {}) => {
  const verifyPassword = jest.fn(() =>
    Promise.resolve(options.passwordMatches ?? true),
  );
  const opened = { count: 0 };
  const execute: ClosureDependencies['unitOfWork']['execute'] = (work) => {
    opened.count += 1;
    fake.calls.push('transaction');
    return work(fake.transaction);
  };
  return {
    verifyPassword,
    opened,
    dependencies: {
      unitOfWork: { execute },
      verifyPassword,
      now: () => now,
      newId: () => 'closure-correlation',
    },
  };
};

describe('closeClientAccount', () => {
  it('closes the Client’s own Account in the order that keeps the ledger and seats consistent', async () => {
    const fake = fakeTransaction();
    const { dependencies, verifyPassword } = setup(fake);

    const result = await closeClientAccount(
      { clientId: 'client-1', password: 'correct horse' },
      client,
      dependencies,
    );

    expect(verifyPassword).toHaveBeenCalledWith(
      'client-account',
      'correct horse',
    );
    expect(fake.calls).toEqual([
      'transaction',
      'lockClient',
      'hasPendingTransferPayment',
      'closeWaitlistEntries',
      'cancelFutureBookings',
      'cancelFutureEvaluations',
      'releaseOpenPurchaseIntent',
      'endSubscription',
      'promoteWaitlists',
      'endPromotionsConsent',
      'closeAccount',
      'removeClient',
      'recordAudit',
    ]);
    expect(result).toEqual({
      closedWaitlistEntries: 2,
      cancelledBookings: 3,
      cancelledEvaluations: 1,
      forfeitedClasses: 4,
      forfeitedCreditCentavos: 0,
    });
  });

  it('writes account.closed with the Client as actor and only counts as metadata', async () => {
    const fake = fakeTransaction();
    const { dependencies } = setup(fake);

    await closeClientAccount(
      { clientId: 'client-1', password: 'correct horse' },
      client,
      dependencies,
    );

    expect(fake.audit).toEqual([
      {
        actorAccountId: 'client-account',
        actorRole: null,
        targetAccountId: 'client-account',
        targetClientId: 'client-1',
        correlationId: 'closure-correlation',
        occurredAt: now,
        metadata: {
          initiatedBy: 'client',
          closedWaitlistEntries: 2,
          cancelledBookings: 3,
          cancelledEvaluations: 1,
          forfeitedClasses: 4,
          forfeitedCreditCentavos: 0,
          keptPromotionContact: false,
          endedPromotionsConsent: false,
        },
      },
    ]);
  });

  it('keeps a Promotion Contact before erasing the Account when the Client ticks the box', async () => {
    const keepPromotionContact = jest.fn(() => {
      fake.calls.push('keepPromotionContact');
      return Promise.resolve();
    });
    const fake = fakeTransaction({ keepPromotionContact });
    const { dependencies } = setup(fake);

    await closeClientAccount(
      { clientId: 'client-1', password: 'correct horse', keepPromotions: true },
      client,
      dependencies,
    );

    expect(keepPromotionContact).toHaveBeenCalledWith({
      clientId: 'client-1',
      accountId: 'client-account',
      consentedAt: now,
    });
    expect(fake.calls.slice(-4)).toEqual([
      'keepPromotionContact',
      'closeAccount',
      'removeClient',
      'recordAudit',
    ]);
    expect(fake.audit[0]?.metadata).toMatchObject({
      keptPromotionContact: true,
    });
  });

  it('ends a live Promotions Consent and carries its time into the Promotion Contact', async () => {
    const consentedAt = new Date('2026-09-01T12:00:00.000Z');
    const endPromotionsConsent = jest.fn(() => {
      fake.calls.push('endPromotionsConsent');
      return Promise.resolve(consentedAt);
    });
    const keepPromotionContact = jest.fn(() => Promise.resolve());
    const fake = fakeTransaction({
      endPromotionsConsent,
      keepPromotionContact,
    });
    const { dependencies } = setup(fake);

    await closeClientAccount(
      { clientId: 'client-1', password: 'correct horse', keepPromotions: true },
      client,
      dependencies,
    );

    expect(endPromotionsConsent).toHaveBeenCalledWith({
      clientId: 'client-1',
      occurredAt: now,
    });
    expect(keepPromotionContact).toHaveBeenCalledWith({
      clientId: 'client-1',
      accountId: 'client-account',
      consentedAt,
    });
    expect(fake.audit[0]?.metadata).toMatchObject({
      keptPromotionContact: true,
      endedPromotionsConsent: true,
    });
  });

  it('ends a live Promotions Consent when an Administrator closes the Account', async () => {
    const endPromotionsConsent = jest.fn(() =>
      Promise.resolve(new Date('2026-09-01T12:00:00.000Z')),
    );
    const fake = fakeTransaction({ endPromotionsConsent });
    const { dependencies } = setup(fake);

    await closeClientAccount(
      { clientId: 'client-1' },
      staff('administrator'),
      dependencies,
    );

    expect(endPromotionsConsent).toHaveBeenCalledWith({
      clientId: 'client-1',
      occurredAt: now,
    });
    expect(fake.audit[0]?.metadata).toMatchObject({
      keptPromotionContact: false,
      endedPromotionsConsent: true,
    });
  });

  it('keeps no Promotion Contact unless the Client ticks the box', async () => {
    const fake = fakeTransaction();
    const { dependencies } = setup(fake);

    await closeClientAccount(
      { clientId: 'client-1', password: 'correct horse' },
      client,
      dependencies,
    );

    expect(fake.calls).not.toContain('keepPromotionContact');
  });

  it('keeps no Promotion Contact when an Administrator closes the Account', async () => {
    const fake = fakeTransaction();
    const { dependencies } = setup(fake);

    await closeClientAccount(
      { clientId: 'client-1', keepPromotions: true },
      staff('administrator'),
      dependencies,
    );

    expect(fake.calls).not.toContain('keepPromotionContact');
  });

  it('promotes the Waitlist of every Session that lost a Booking', async () => {
    const promoteWaitlists = jest.fn(() => Promise.resolve());
    const fake = fakeTransaction({ promoteWaitlists });
    const { dependencies } = setup(fake);

    await closeClientAccount(
      { clientId: 'client-1', password: 'correct horse' },
      client,
      dependencies,
    );

    expect(promoteWaitlists).toHaveBeenCalledWith(
      ['session-1', 'session-2'],
      now,
    );
  });

  it('refuses while a transfer Payment is pending review and changes nothing', async () => {
    const fake = fakeTransaction({
      hasPendingTransferPayment: () => Promise.resolve(true),
    });
    const { dependencies } = setup(fake);

    await expect(
      closeClientAccount(
        { clientId: 'client-1', password: 'correct horse' },
        client,
        dependencies,
      ),
    ).rejects.toMatchObject({
      code: 'closure_payment_pending',
      status: 409,
    });
    expect(fake.calls).toEqual(['transaction', 'lockClient']);
    expect(fake.audit).toEqual([]);
  });

  it('rejects a wrong password before opening a transaction', async () => {
    const fake = fakeTransaction();
    const { dependencies, opened } = setup(fake, { passwordMatches: false });

    await expect(
      closeClientAccount(
        { clientId: 'client-1', password: 'wrong' },
        client,
        dependencies,
      ),
    ).rejects.toMatchObject({
      code: 'current_password_incorrect',
      status: 400,
    });
    expect(opened.count).toBe(0);
  });

  it('does not let a Client close another Client’s Account', async () => {
    const fake = fakeTransaction();
    const { dependencies, opened } = setup(fake);

    await expect(
      closeClientAccount(
        { clientId: 'client-2', password: 'correct horse' },
        client,
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'closure_access_denied', status: 403 });
    expect(opened.count).toBe(0);
  });

  it.each(['assistant', 'trainer', 'nutritionist'] as const)(
    'does not let a %s close a Client’s Account',
    async (role) => {
      const fake = fakeTransaction();
      const { dependencies, opened } = setup(fake);

      await expect(
        closeClientAccount({ clientId: 'client-1' }, staff(role), dependencies),
      ).rejects.toBeInstanceOf(AccountClosureError);
      expect(opened.count).toBe(0);
    },
  );

  it('lets an Administrator close a Client’s Account without the Client’s password', async () => {
    const fake = fakeTransaction();
    const { dependencies, verifyPassword } = setup(fake);

    await closeClientAccount(
      { clientId: 'client-1' },
      staff('administrator'),
      dependencies,
    );

    expect(verifyPassword).not.toHaveBeenCalled();
    expect(fake.audit[0]).toMatchObject({
      actorAccountId: 'staff-account',
      actorRole: 'administrator',
      targetAccountId: 'client-account',
      targetClientId: 'client-1',
      metadata: { initiatedBy: 'administrator' },
    });
  });

  it('reports a missing or already closed Client as not found', async () => {
    const fake = fakeTransaction({ lockClient: () => Promise.resolve(null) });
    const { dependencies } = setup(fake);

    await expect(
      closeClientAccount(
        { clientId: 'client-1' },
        staff('administrator'),
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'client_not_found', status: 404 });
    expect(fake.audit).toEqual([]);
  });
});
