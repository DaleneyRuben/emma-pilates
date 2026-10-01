import { jest } from '@jest/globals';
import {
  admitEmailRequest,
  type EmailSourceBudgetGateway,
  EmailSourceThrottledError,
} from './admit-email-request';

const now = new Date('2026-10-01T15:00:00.000Z');

const dependencies = (wait: number) => {
  const admit = jest.fn<EmailSourceBudgetGateway['admit']>(() =>
    Promise.resolve(wait),
  );

  return {
    admit,
    dependencies: {
      gateway: { admit },
      digestSignal: (value: string) => Buffer.from(`digest:${value}`),
      now: () => now,
    },
  };
};

describe('admitEmailRequest (BE-012)', () => {
  it('records the request under Login’s client and network digests for 24 hours', async () => {
    const { admit, dependencies: deps } = dependencies(0);

    await admitEmailRequest(
      {
        group: 'verification',
        clientIdentifier: 'installation-identifier-1',
        networkAddress: '198.51.100.7',
      },
      deps,
    );

    expect(admit).toHaveBeenCalledWith({
      group: 'verification',
      clientDigest: Buffer.from('digest:client:installation-identifier-1'),
      networkDigest: Buffer.from('digest:network:198.51.100.7'),
      now,
      expiresAt: new Date('2026-10-02T15:00:00.000Z'),
      waitSeconds: expect.any(Function),
    });
  });

  it('decides with the budget of the request’s group', async () => {
    const { admit, dependencies: deps } = dependencies(0);

    await admitEmailRequest(
      {
        group: 'password_recovery',
        clientIdentifier: 'installation-identifier-1',
        networkAddress: '198.51.100.7',
      },
      deps,
    );
    const { waitSeconds } = admit.mock.calls[0][0];
    const fiveRecent = Array.from(
      { length: 5 },
      () => new Date(now.getTime() - 60_000),
    );

    expect(waitSeconds({ client: fiveRecent, network: [] })).toBe(14 * 60);
  });

  it('keys a request without a client identifier by its network alone', async () => {
    const { admit, dependencies: deps } = dependencies(0);

    await admitEmailRequest(
      {
        group: 'verification',
        clientIdentifier: null,
        networkAddress: '198.51.100.7',
      },
      deps,
    );

    expect(admit).toHaveBeenCalledWith(
      expect.objectContaining({ clientDigest: null }),
    );
  });

  it('refuses with the wait when a lane is full', async () => {
    const { dependencies: deps } = dependencies(75);

    await expect(
      admitEmailRequest(
        {
          group: 'verification',
          clientIdentifier: null,
          networkAddress: '198.51.100.7',
        },
        deps,
      ),
    ).rejects.toEqual(new EmailSourceThrottledError(75));
    await expect(
      admitEmailRequest(
        {
          group: 'verification',
          clientIdentifier: null,
          networkAddress: '198.51.100.7',
        },
        deps,
      ),
    ).rejects.toMatchObject({ retryAfterSeconds: 75 });
  });
});
