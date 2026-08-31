import { VerifyClientEmail } from './verify-client-email';

describe('VerifyClientEmail', () => {
  it('consumes the Verification Link without creating a session', async () => {
    const now = new Date('2026-08-30T22:00:00.000Z');
    const verify = jest.fn().mockResolvedValue('verified');
    const useCase = new VerifyClientEmail({
      gateway: { verify },
      tokens: {
        digest: jest.fn().mockReturnValue(Buffer.from('verification-digest')),
      },
      now: () => now,
    });

    await expect(
      useCase.execute({ verificationToken: 'verification-secret' }),
    ).resolves.toEqual({ status: 'verified' });
    expect(verify).toHaveBeenCalledWith({
      verificationDigest: Buffer.from('verification-digest'),
      now,
    });
  });
});
