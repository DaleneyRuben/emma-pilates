import {
  AdministratorAlreadyActiveError,
  bootstrapFirstAdministrator,
  BootstrapEmailInUseError,
  BootstrapEmailThrottledError,
  BootstrapPendingForAnotherEmailError,
  type AdministratorBootstrapTransaction,
} from './bootstrap-first-administrator';

const now = new Date('2026-09-23T12:00:00.000Z');
const day = 24 * 60 * 60 * 1_000;

const createTransaction = (
  overrides: Partial<jest.Mocked<AdministratorBootstrapTransaction>> = {},
): jest.Mocked<AdministratorBootstrapTransaction> => ({
  lockBootstrap: jest.fn().mockResolvedValue(undefined),
  findAdministratorAccounts: jest.fn().mockResolvedValue([]),
  findAccountByEmail: jest.fn().mockResolvedValue(null),
  canIssueAuthenticationEmail: jest.fn().mockResolvedValue(true),
  recordIssuedAuthenticationEmail: jest.fn().mockResolvedValue(undefined),
  createPendingAdministrator: jest.fn().mockResolvedValue(undefined),
  replaceStaffInvitationActivation: jest.fn().mockResolvedValue(undefined),
  scheduleAuthenticationEmail: jest.fn().mockResolvedValue(undefined),
  recordAudit: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

let ids = 0;
const dependencies = (transaction: AdministratorBootstrapTransaction) => ({
  unitOfWork: {
    execute: <Result>(
      work: (tx: AdministratorBootstrapTransaction) => Promise<Result>,
    ) => work(transaction),
  },
  tokenIssuer: {
    issue: () => ({ secret: 'link-secret', digest: Buffer.from('digest') }),
  },
  linkCipher: {
    encrypt: () => ({
      encryptedLinkSecret: 'encrypted',
      encryptionKeyId: 'key-1',
    }),
  },
  now: () => now,
  newId: () => `id-${(ids += 1)}`,
});

const command = { email: '  Emma@Example.COM ', name: '  Emma Díaz ' };

beforeEach(() => {
  ids = 0;
});

describe('bootstrapFirstAdministrator', () => {
  it('creates a pending Administrator with a 7-day activation link, a queued email, and a bootstrap audit', async () => {
    const transaction = createTransaction();

    const result = await bootstrapFirstAdministrator(
      command,
      dependencies(transaction),
    );

    expect(transaction.lockBootstrap).toHaveBeenCalledTimes(1);
    expect(transaction.findAccountByEmail).toHaveBeenCalledWith(
      'emma@example.com',
    );
    expect(transaction.createPendingAdministrator).toHaveBeenCalledWith({
      accountId: 'id-1',
      staffMemberId: 'id-2',
      name: 'Emma Díaz',
      email: 'emma@example.com',
      pendingExpiresAt: new Date(now.getTime() + 30 * day),
      activationToken: {
        id: 'id-3',
        digest: Buffer.from('digest'),
        expiresAt: new Date(now.getTime() + 7 * day),
      },
    });
    expect(transaction.recordIssuedAuthenticationEmail).toHaveBeenCalledWith({
      email: 'emma@example.com',
      purpose: 'activation',
      occurredAt: now,
    });
    expect(transaction.scheduleAuthenticationEmail).toHaveBeenCalledWith({
      version: 1,
      accountId: 'id-1',
      authenticationTokenId: 'id-3',
      purpose: 'activation',
      encryptedLinkSecret: 'encrypted',
      encryptionKeyId: 'key-1',
    });
    expect(transaction.recordAudit).toHaveBeenCalledWith({
      actionCode: 'administrator_bootstrap.created',
      targetAccountId: 'id-1',
      correlationId: 'id-4',
      occurredAt: now,
    });
    expect(result).toEqual({
      status: 'created',
      accountId: 'id-1',
      staffMemberId: 'id-2',
      email: 'emma@example.com',
      activationExpiresAt: new Date(now.getTime() + 7 * day),
    });
  });

  it('reuses the pending bootstrap Account for the same email and replaces its activation link', async () => {
    const transaction = createTransaction({
      findAdministratorAccounts: jest.fn().mockResolvedValue([
        {
          accountId: 'pending-account',
          staffMemberId: 'pending-staff',
          email: 'emma@example.com',
          activated: false,
        },
      ]),
      findAccountByEmail: jest
        .fn()
        .mockResolvedValue({ id: 'pending-account' }),
    });

    const result = await bootstrapFirstAdministrator(
      command,
      dependencies(transaction),
    );

    expect(transaction.createPendingAdministrator).not.toHaveBeenCalled();
    expect(transaction.replaceStaffInvitationActivation).toHaveBeenCalledWith({
      accountId: 'pending-account',
      pendingExpiresAt: new Date(now.getTime() + 30 * day),
      activationToken: {
        id: 'id-1',
        digest: Buffer.from('digest'),
        expiresAt: new Date(now.getTime() + 7 * day),
      },
    });
    expect(transaction.scheduleAuthenticationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'pending-account',
        authenticationTokenId: 'id-1',
        purpose: 'activation',
      }),
    );
    expect(transaction.recordAudit).toHaveBeenCalledWith({
      actionCode: 'administrator_bootstrap.activation_resent',
      targetAccountId: 'pending-account',
      correlationId: 'id-2',
      occurredAt: now,
    });
    expect(result).toEqual({
      status: 'activation_resent',
      accountId: 'pending-account',
      staffMemberId: 'pending-staff',
      email: 'emma@example.com',
      activationExpiresAt: new Date(now.getTime() + 7 * day),
    });
  });

  it('refuses without changes once any Administrator is activated', async () => {
    const transaction = createTransaction({
      findAdministratorAccounts: jest.fn().mockResolvedValue([
        {
          accountId: 'active-account',
          staffMemberId: 'active-staff',
          email: 'emma@example.com',
          activated: true,
        },
      ]),
    });

    await expect(
      bootstrapFirstAdministrator(command, dependencies(transaction)),
    ).rejects.toBeInstanceOf(AdministratorAlreadyActiveError);
    expectNoChanges(transaction);
  });

  it('refuses without changes while a bootstrap Account is pending for another email', async () => {
    const transaction = createTransaction({
      findAdministratorAccounts: jest.fn().mockResolvedValue([
        {
          accountId: 'other-account',
          staffMemberId: 'other-staff',
          email: 'otra@example.com',
          activated: false,
        },
      ]),
    });

    await expect(
      bootstrapFirstAdministrator(command, dependencies(transaction)),
    ).rejects.toBeInstanceOf(BootstrapPendingForAnotherEmailError);
    expectNoChanges(transaction);
  });

  it('refuses without changes when the email belongs to a non-Administrator Account', async () => {
    const transaction = createTransaction({
      findAccountByEmail: jest.fn().mockResolvedValue({ id: 'client-account' }),
    });

    await expect(
      bootstrapFirstAdministrator(command, dependencies(transaction)),
    ).rejects.toBeInstanceOf(BootstrapEmailInUseError);
    expectNoChanges(transaction);
  });

  it('refuses without changes when the recipient throttle has no room', async () => {
    const transaction = createTransaction({
      canIssueAuthenticationEmail: jest.fn().mockResolvedValue(false),
    });

    await expect(
      bootstrapFirstAdministrator(command, dependencies(transaction)),
    ).rejects.toBeInstanceOf(BootstrapEmailThrottledError);
    expectNoChanges(transaction);
  });
});

const expectNoChanges = (
  transaction: jest.Mocked<AdministratorBootstrapTransaction>,
): void => {
  expect(transaction.createPendingAdministrator).not.toHaveBeenCalled();
  expect(transaction.replaceStaffInvitationActivation).not.toHaveBeenCalled();
  expect(transaction.recordIssuedAuthenticationEmail).not.toHaveBeenCalled();
  expect(transaction.scheduleAuthenticationEmail).not.toHaveBeenCalled();
  expect(transaction.recordAudit).not.toHaveBeenCalled();
};
