import {
  cancelEmailChange,
  completeEmailChange,
  EmailChangeError,
  readPendingEmailChange,
  requestEmailChange,
  resendEmailChange,
  type EmailChangeGateway,
} from './email-change';

const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};
const now = new Date('2026-09-24T15:00:00.000Z');
const dayLater = new Date('2026-09-25T15:00:00.000Z');

const gateway = (): jest.Mocked<EmailChangeGateway> => ({
  request: jest.fn().mockResolvedValue('requested'),
  resend: jest.fn().mockResolvedValue('sent'),
  cancel: jest.fn().mockResolvedValue('cancelled'),
  readPending: jest.fn().mockResolvedValue(null),
  complete: jest.fn().mockResolvedValue('changed'),
});

const dependencies = (photos = gateway()) => ({
  gateway: photos,
  tokens: {
    issue: jest.fn().mockReturnValue({
      secret: 'link-secret',
      digest: new Uint8Array([1, 2, 3]),
    }),
    digest: jest.fn().mockReturnValue(new Uint8Array([9, 9, 9])),
  },
  linkCipher: {
    encrypt: jest.fn().mockReturnValue({
      encryptedLinkSecret: 'ciphertext',
      encryptionKeyId: 'local-key',
    }),
  },
  now: () => now,
  newId: jest.fn().mockReturnValue('token-id'),
});

describe('requestEmailChange', () => {
  it('stores a 24-hour email change link for the normalized new address and queues the link and the notice', async () => {
    const deps = dependencies();

    await expect(
      requestEmailChange(
        { email: '  Lucia.Nueva@Example.com ' },
        principal,
        deps,
      ),
    ).resolves.toEqual({
      status: 'verification_required',
      email: 'lucia.nueva@example.com',
    });

    expect(deps.gateway.request).toHaveBeenCalledWith({
      accountId: 'account-id',
      newEmail: 'lucia.nueva@example.com',
      now,
      token: {
        id: 'token-id',
        digest: new Uint8Array([1, 2, 3]),
        expiresAt: dayLater,
      },
      linkJob: {
        version: 1,
        accountId: 'account-id',
        authenticationTokenId: 'token-id',
        purpose: 'email_change',
        encryptedLinkSecret: 'ciphertext',
        encryptionKeyId: 'local-key',
      },
      noticeJob: {
        version: 1,
        accountId: 'account-id',
        authenticationTokenId: 'token-id',
        purpose: 'email_change_notice',
        encryptedLinkSecret: 'ciphertext',
        encryptionKeyId: 'local-key',
      },
    });
    expect(deps.linkCipher.encrypt).toHaveBeenCalledWith('link-secret');
  });

  it('refuses the current address and an Account that is not active', async () => {
    const deps = dependencies();
    deps.gateway.request.mockResolvedValueOnce('unchanged');
    await expect(
      requestEmailChange({ email: 'lucia@example.com' }, principal, deps),
    ).rejects.toMatchObject({ code: 'email_unchanged', status: 400 });

    deps.gateway.request.mockResolvedValueOnce('not_active');
    await expect(
      requestEmailChange({ email: 'x@example.com' }, principal, deps),
    ).rejects.toMatchObject({ code: 'account_not_active', status: 409 });
  });
});

describe('resendEmailChange', () => {
  it('reissues the link and answers neutrally whether it was sent or suppressed', async () => {
    const deps = dependencies();

    await expect(resendEmailChange(principal, deps)).resolves.toEqual({
      status: 'verification_required',
    });
    expect(deps.gateway.resend).toHaveBeenCalledWith({
      accountId: 'account-id',
      now,
      token: {
        id: 'token-id',
        digest: new Uint8Array([1, 2, 3]),
        expiresAt: dayLater,
      },
      linkJob: expect.objectContaining({
        purpose: 'email_change',
        authenticationTokenId: 'token-id',
      }),
    });

    deps.gateway.resend.mockResolvedValueOnce('suppressed');
    await expect(resendEmailChange(principal, deps)).resolves.toEqual({
      status: 'verification_required',
    });
  });

  it('reports when nothing is pending', async () => {
    const deps = dependencies();
    deps.gateway.resend.mockResolvedValueOnce('none');

    await expect(resendEmailChange(principal, deps)).rejects.toMatchObject({
      code: 'email_change_not_pending',
      status: 404,
    });
  });
});

describe('cancelEmailChange', () => {
  it('cancels the pending change and is idempotent', async () => {
    const deps = dependencies();
    deps.gateway.cancel.mockResolvedValueOnce('cancelled');
    await expect(cancelEmailChange(principal, deps)).resolves.toBeUndefined();
    expect(deps.gateway.cancel).toHaveBeenCalledWith({
      accountId: 'account-id',
      now,
    });

    deps.gateway.cancel.mockResolvedValueOnce('none');
    await expect(cancelEmailChange(principal, deps)).resolves.toBeUndefined();
  });
});

describe('readPendingEmailChange', () => {
  it('returns the live pending change or null', async () => {
    const deps = dependencies();
    deps.gateway.readPending.mockResolvedValueOnce({
      email: 'lucia.nueva@example.com',
      requestedAt: now,
      expiresAt: dayLater,
    });

    await expect(readPendingEmailChange(principal, deps)).resolves.toEqual({
      pending: {
        email: 'lucia.nueva@example.com',
        requestedAt: now,
        expiresAt: dayLater,
      },
    });
    expect(deps.gateway.readPending).toHaveBeenCalledWith({
      accountId: 'account-id',
      now,
    });

    await expect(readPendingEmailChange(principal, deps)).resolves.toEqual({
      pending: null,
    });
  });
});

describe('completeEmailChange', () => {
  it('completes the change by the link secret digest', async () => {
    const deps = dependencies();

    await expect(
      completeEmailChange({ token: 'link-secret' }, deps),
    ).resolves.toEqual({
      status: 'changed',
    });
    expect(deps.tokens.digest).toHaveBeenCalledWith('link-secret');
    expect(deps.gateway.complete).toHaveBeenCalledWith({
      tokenDigest: new Uint8Array([9, 9, 9]),
      now,
    });
  });

  it.each(['expired', 'invalid', 'email_unavailable'] as const)(
    'passes the %s outcome through',
    async (status) => {
      const deps = dependencies();
      deps.gateway.complete.mockResolvedValueOnce(status);
      await expect(completeEmailChange({ token: 'x' }, deps)).resolves.toEqual({
        status,
      });
    },
  );

  it('exposes the stable codes as EmailChangeError', () => {
    expect(new EmailChangeError('email_change_not_pending').status).toBe(404);
  });
});
