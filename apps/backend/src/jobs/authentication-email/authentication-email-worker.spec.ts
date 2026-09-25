import { AuthenticationEmailDeliveryError } from './authentication-email-failure';
import type { AuthenticationEmailJob } from './authentication-email-job';
import { AUTHENTICATION_EMAIL_QUEUE } from './authentication-email-job';
import {
  registerAuthenticationEmailWorker,
  type AuthenticationEmailWorkerBoss,
  type AuthenticationEmailWorkerHandler,
} from './authentication-email-worker';

const payload: AuthenticationEmailJob = {
  version: 1,
  accountId: '0ae2701e-f8ac-4c8a-8cf0-65182ee0fc1d',
  authenticationTokenId: 'b6421a64-1429-4864-830f-e49a67438488',
  purpose: 'verification',
  encryptedLinkSecret: 'ciphertext',
  encryptionKeyId: 'local-test-key',
};

const currentState = {
  accountId: payload.accountId,
  email: 'client@example.com',
  purpose: payload.purpose,
  expiresAt: new Date('2026-08-30T16:00:00.000Z'),
  usedAt: null,
  invalidatedAt: null,
};

const dependencies = (deliveryError?: AuthenticationEmailDeliveryError) => ({
  stateReader: { find: jest.fn().mockResolvedValue(currentState) },
  decryptor: { decrypt: jest.fn().mockResolvedValue('link-secret') },
  renderer: {
    render: jest.fn().mockReturnValue({
      recipient: currentState.email,
      purpose: payload.purpose,
      subject: 'Verify your Pilates account',
      link: 'pilates://verify?token=link-secret',
      text: 'text',
      html: '<p>html</p>',
    }),
  },
  delivery: {
    deliver: deliveryError
      ? jest.fn().mockRejectedValue(deliveryError)
      : jest.fn().mockResolvedValue(undefined),
  },
});

const register = async (
  workerDependencies: ReturnType<typeof dependencies>,
): Promise<AuthenticationEmailWorkerHandler> => {
  let handler: AuthenticationEmailWorkerHandler | undefined;
  const work = jest.fn<
    Promise<string>,
    Parameters<AuthenticationEmailWorkerBoss['work']>
  >((_name, _options, registeredHandler) => {
    handler = registeredHandler;
    return Promise.resolve('worker-id');
  });
  const boss: AuthenticationEmailWorkerBoss = { work };

  await registerAuthenticationEmailWorker(
    boss,
    workerDependencies,
    () => new Date('2026-08-30T15:00:00.000Z'),
  );

  expect(work).toHaveBeenCalledWith(
    AUTHENTICATION_EMAIL_QUEUE,
    { perJobResults: true },
    expect.any(Function),
  );

  if (handler === undefined) {
    throw new Error('Worker handler was not registered');
  }

  return handler;
};

describe('authentication email worker', () => {
  it('completes delivered jobs with sanitized output', async () => {
    const handler = await register(dependencies());

    await expect(handler([{ id: 'job-1', data: payload }])).resolves.toEqual([
      { id: 'job-1', status: 'completed', output: { outcome: 'delivered' } },
    ]);
  });

  it('fails retryable delivery errors for pg-boss to retry', async () => {
    const handler = await register(
      dependencies(new AuthenticationEmailDeliveryError('network')),
    );

    await expect(handler([{ id: 'job-2', data: payload }])).resolves.toEqual([
      {
        id: 'job-2',
        status: 'failed',
        output: { failureCategory: 'network' },
      },
    ]);
  });

  it('dead-letters permanent delivery errors immediately', async () => {
    const handler = await register(
      dependencies(
        new AuthenticationEmailDeliveryError('provider_authentication'),
      ),
    );

    await expect(handler([{ id: 'job-3', data: payload }])).resolves.toEqual([
      {
        id: 'job-3',
        status: 'deadletter',
        output: { failureCategory: 'provider_authentication' },
      },
    ]);
  });

  it('dead-letters invalid payloads without exposing their contents', async () => {
    const handler = await register(dependencies());

    await expect(
      handler([
        {
          id: 'job-4',
          data: { ...payload, email: 'secret@example.com' },
        },
      ]),
    ).resolves.toEqual([
      {
        id: 'job-4',
        status: 'deadletter',
        output: { failureCategory: 'invalid_payload' },
      },
    ]);
  });
});
