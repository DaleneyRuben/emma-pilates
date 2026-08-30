import type { AuthenticationEmailMessage } from './authentication-email-delivery';
import { processAuthenticationEmail } from './process-authentication-email';

const job = {
  version: 1,
  accountId: '0ae2701e-f8ac-4c8a-8cf0-65182ee0fc1d',
  authenticationTokenId: 'b6421a64-1429-4864-830f-e49a67438488',
  purpose: 'verification',
  encryptedLinkSecret: 'ciphertext',
  encryptionKeyId: 'local-test-key',
} as const;

describe('processAuthenticationEmail', () => {
  it('delivers an email for a current authentication token', async () => {
    const stateReader = {
      find: jest.fn().mockResolvedValue({
        accountId: job.accountId,
        email: 'client@example.com',
        purpose: job.purpose,
        expiresAt: new Date('2026-08-30T16:00:00.000Z'),
        usedAt: null,
        invalidatedAt: null,
      }),
    };
    const decryptor = {
      decrypt: jest.fn().mockResolvedValue('link-secret'),
    };
    const renderer = {
      render: jest.fn().mockReturnValue({
        recipient: 'client@example.com',
        purpose: 'verification',
        subject: 'Verify your Pilates account',
        link: 'pilates://verify?token=link-secret',
      }),
    };
    const deliver = jest
      .fn<
        Promise<void>,
        [AuthenticationEmailMessage, { signal: AbortSignal }]
      >()
      .mockResolvedValue(undefined);
    const delivery = { deliver };

    await expect(
      processAuthenticationEmail(job, new Date('2026-08-30T15:00:00.000Z'), {
        stateReader,
        decryptor,
        renderer,
        delivery,
      }),
    ).resolves.toBe('delivered');

    expect(stateReader.find).toHaveBeenCalledWith(job.authenticationTokenId);
    expect(decryptor.decrypt).toHaveBeenCalledWith(
      job.encryptedLinkSecret,
      job.encryptionKeyId,
    );
    expect(renderer.render).toHaveBeenCalledWith({
      recipient: 'client@example.com',
      purpose: job.purpose,
      linkSecret: 'link-secret',
    });
    expect(delivery.deliver).toHaveBeenCalledTimes(1);
    expect(delivery.deliver.mock.calls[0][0]).toEqual({
      recipient: 'client@example.com',
      purpose: 'verification',
      subject: 'Verify your Pilates account',
      link: 'pilates://verify?token=link-secret',
    });
    expect(delivery.deliver.mock.calls[0][1].signal).toBeInstanceOf(
      AbortSignal,
    );
  });

  it.each([
    ['missing', null],
    [
      'different Account',
      {
        accountId: '3791c5b6-12c1-4b4f-8b99-e929ad721bf1',
        email: 'client@example.com',
        purpose: job.purpose,
        expiresAt: new Date('2026-08-30T16:00:00.000Z'),
        usedAt: null,
        invalidatedAt: null,
      },
    ],
    [
      'different purpose',
      {
        accountId: job.accountId,
        email: 'client@example.com',
        purpose: 'activation',
        expiresAt: new Date('2026-08-30T16:00:00.000Z'),
        usedAt: null,
        invalidatedAt: null,
      },
    ],
    [
      'used',
      {
        accountId: job.accountId,
        email: 'client@example.com',
        purpose: job.purpose,
        expiresAt: new Date('2026-08-30T16:00:00.000Z'),
        usedAt: new Date('2026-08-30T14:00:00.000Z'),
        invalidatedAt: null,
      },
    ],
    [
      'invalidated',
      {
        accountId: job.accountId,
        email: 'client@example.com',
        purpose: job.purpose,
        expiresAt: new Date('2026-08-30T16:00:00.000Z'),
        usedAt: null,
        invalidatedAt: new Date('2026-08-30T14:00:00.000Z'),
      },
    ],
    [
      'expired',
      {
        accountId: job.accountId,
        email: 'client@example.com',
        purpose: job.purpose,
        expiresAt: new Date('2026-08-30T15:00:00.000Z'),
        usedAt: null,
        invalidatedAt: null,
      },
    ],
  ])('skips a %s authentication token', async (_reason, state) => {
    const decryptor = { decrypt: jest.fn() };
    const renderer = { render: jest.fn() };
    const delivery = { deliver: jest.fn() };

    await expect(
      processAuthenticationEmail(job, new Date('2026-08-30T15:00:00.000Z'), {
        stateReader: { find: jest.fn().mockResolvedValue(state) },
        decryptor,
        renderer,
        delivery,
      }),
    ).resolves.toBe('stale');

    expect(decryptor.decrypt).not.toHaveBeenCalled();
    expect(renderer.render).not.toHaveBeenCalled();
    expect(delivery.deliver).not.toHaveBeenCalled();
  });
});
