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
    const delivery = { deliver: jest.fn().mockResolvedValue(undefined) };

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
    expect(delivery.deliver).toHaveBeenCalledWith({
      recipient: 'client@example.com',
      purpose: 'verification',
      subject: 'Verify your Pilates account',
      link: 'pilates://verify?token=link-secret',
    });
  });
});
