import { CancelPendingClientRegistration } from './cancel-pending-client-registration';

describe('CancelPendingClientRegistration', () => {
  it('authorizes cancellation with the registration continuation', async () => {
    const now = new Date('2026-08-30T21:00:00.000Z');
    const cancel = jest.fn().mockResolvedValue('cancelled');
    const useCase = new CancelPendingClientRegistration({
      gateway: { cancel },
      tokens: {
        digest: jest.fn().mockReturnValue(Buffer.from('continuation-digest')),
      },
      now: () => now,
      newId: () => '0198f5ef-6140-7b63-a9a3-4f8470547197',
    });

    await expect(
      useCase.execute({ registrationContinuation: 'continuation-secret' }),
    ).resolves.toEqual({ status: 'cancelled' });
    expect(cancel).toHaveBeenCalledWith({
      continuationDigest: Buffer.from('continuation-digest'),
      now,
      correlationId: '0198f5ef-6140-7b63-a9a3-4f8470547197',
    });
  });
});
