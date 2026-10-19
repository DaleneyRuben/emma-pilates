import { processAuthenticationEmail } from './process-authentication-email';

const job = {
  version: 1,
  accountId: '0ae2701e-f8ac-4c8a-8cf0-65182ee0fc1d',
  authenticationTokenId: 'b6421a64-1429-4864-830f-e49a67438488',
  purpose: 'email_change',
  encryptedLinkSecret: 'ciphertext',
  encryptionKeyId: 'local-test-key',
} as const;
const now = new Date('2026-10-19T15:00:00.000Z');

const dependencies = (suppressed: boolean) => ({
  stateReader: {
    find: jest.fn().mockResolvedValue({
      accountId: job.accountId,
      email: 'client@example.com',
      pendingEmail: 'client.nueva@example.com',
      purpose: 'email_change',
      expiresAt: new Date('2026-10-19T16:00:00.000Z'),
      usedAt: null,
      invalidatedAt: null,
    }),
  },
  decryptor: { decrypt: jest.fn().mockResolvedValue('link-secret') },
  renderer: {
    render: jest.fn().mockReturnValue({
      recipient: 'client.nueva@example.com',
      purpose: 'email_change',
      subject: 'x',
      link: 'y',
      text: 'text',
      html: '<p>html</p>',
    }),
  },
  delivery: { deliver: jest.fn().mockResolvedValue(undefined) },
  suppressions: { isSuppressed: jest.fn().mockResolvedValue(suppressed) },
});

// ADR-0031 and ADR-0094: a hard bounce or complaint stops further email to
// that address, checked on the address the message would go to.
describe('processAuthenticationEmail and suppressed addresses', () => {
  it('sends nothing to a suppressed recipient and never decrypts the link', async () => {
    const deps = dependencies(true);

    await expect(processAuthenticationEmail(job, now, deps)).resolves.toBe(
      'suppressed',
    );

    expect(deps.suppressions.isSuppressed).toHaveBeenCalledWith(
      'client.nueva@example.com',
    );
    expect(deps.decryptor.decrypt).not.toHaveBeenCalled();
    expect(deps.delivery.deliver).not.toHaveBeenCalled();
  });

  it('delivers to a recipient that is not suppressed', async () => {
    const deps = dependencies(false);

    await expect(processAuthenticationEmail(job, now, deps)).resolves.toBe(
      'delivered',
    );

    expect(deps.delivery.deliver).toHaveBeenCalledTimes(1);
  });

  it('checks the current address for the old-address notice', async () => {
    const deps = dependencies(true);

    await processAuthenticationEmail(
      { ...job, purpose: 'email_change_notice' },
      now,
      deps,
    );

    expect(deps.suppressions.isSuppressed).toHaveBeenCalledWith(
      'client@example.com',
    );
  });
});
