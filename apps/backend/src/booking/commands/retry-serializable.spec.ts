import { retrySerializable } from './retry-serializable';

describe('retrySerializable', () => {
  it('retries a Prisma serialization conflict and returns the committed result', async () => {
    const execute = jest
      .fn()
      .mockRejectedValueOnce({ code: 'P2034' })
      .mockResolvedValueOnce('booking-id');
    const sleep = jest.fn().mockResolvedValue(undefined);

    await expect(retrySerializable(execute, { sleep })).resolves.toBe(
      'booking-id',
    );
    expect(execute).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
  });

  it('does not retry non-transaction failures', async () => {
    const failure = new Error('Session is full');
    const execute = jest.fn().mockRejectedValue(failure);

    await expect(retrySerializable(execute)).rejects.toBe(failure);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('stops retrying after five serialization conflicts', async () => {
    const failure = { code: 'P2034' };
    const execute = jest.fn().mockRejectedValue(failure);
    const sleep = jest.fn().mockResolvedValue(undefined);

    await expect(retrySerializable(execute, { sleep })).rejects.toBe(failure);
    expect(execute).toHaveBeenCalledTimes(5);
    expect(sleep).toHaveBeenCalledTimes(4);
  });
});
