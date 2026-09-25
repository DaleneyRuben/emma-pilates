import {
  AUTHENTICATION_EMAIL_FAILED_QUEUE,
  AUTHENTICATION_EMAIL_QUEUE,
  authenticationEmailQueueOptions,
  parseAuthenticationEmailJob,
} from './authentication-email-job';

describe('authentication email job contract', () => {
  const payload = {
    version: 1,
    accountId: '63b83bb4-65b8-4e24-bbb3-b42c59d1e261',
    authenticationTokenId: 'f0252fc7-90e4-40db-96b2-b7cb19d44f12',
    purpose: 'verification',
    encryptedLinkSecret: 'encrypted-link-secret',
    encryptionKeyId: 'auth-links-2026-01',
  } as const;

  it('accepts the minimal versioned payload', () => {
    expect(parseAuthenticationEmailJob(payload)).toEqual(payload);
  });

  it('rejects plaintext recipient and link fields', () => {
    expect(() =>
      parseAuthenticationEmailJob({
        ...payload,
        email: 'client@example.com',
        link: 'pilates://verify?token=plaintext',
      }),
    ).toThrow();
  });

  it('uses the approved queues and bounded native retry preset', () => {
    expect(AUTHENTICATION_EMAIL_QUEUE).toBe('system.authentication-email.v1');
    expect(AUTHENTICATION_EMAIL_FAILED_QUEUE).toBe(
      'system.authentication-email.failed.v1',
    );
    expect(authenticationEmailQueueOptions).toEqual({
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
      retryDelayMax: 300,
      expireInSeconds: 30,
      retentionSeconds: 691_200,
      deleteAfterSeconds: 604_800,
      deadLetter: 'system.authentication-email.failed.v1',
    });
  });

  it.each(['email_change', 'email_change_notice'] as const)(
    'accepts the %s purpose of IDN-008',
    (purpose) => {
      expect(parseAuthenticationEmailJob({ ...payload, purpose })).toEqual({
        ...payload,
        purpose,
      });
    },
  );
});
