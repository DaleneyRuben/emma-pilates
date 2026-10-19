import { validateEnvironment } from './environment';

describe('environment configuration', () => {
  it('rejects configuration when DATABASE_URL is missing', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'test' })).toThrow(
      'DATABASE_URL',
    );
  });

  it('converts the configured port to a number', () => {
    const environment = validateEnvironment({
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      NODE_ENV: 'test',
      PORT: '4100',
    });

    expect(environment.PORT).toBe(4100);
  });

  it('uses the conflict-free local API port by default', () => {
    const environment = validateEnvironment({
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      NODE_ENV: 'test',
    });

    expect(environment.PORT).toBe(3100);
  });

  it('requires explicit authentication secrets in production', () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
        NODE_ENV: 'production',
      }),
    ).toThrow('AUTHENTICATION_LINK_ENCRYPTION_KEY');
  });

  it('defaults the transfer QR and referral reward for local development', () => {
    const environment = validateEnvironment({
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      NODE_ENV: 'test',
    });

    expect(environment).toMatchObject({
      TRANSFER_QR_IMAGE_PATH: '.data/transfer-qr.png',
      REFERRAL_REWARD_CENTAVOS: 6000,
    });
  });

  describe('transfer instructions in production', () => {
    const production = {
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      NODE_ENV: 'production',
      AUTHENTICATION_EMAIL_DIGEST_KEY: 'x'.repeat(32),
      AUTHENTICATION_LINK_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString(
        'base64',
      ),
      AUTHENTICATION_LINK_ENCRYPTION_KEY_ID: 'prod-v1',
      AUTHENTICATION_LINK_BASE_URL: 'https://links.emmapilates.bo',
      ADMIN_WEB_TRUSTED_ORIGINS: 'https://admin.emmapilates.bo',
      OBJECT_STORAGE: 's3',
      OBJECT_STORAGE_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
      OBJECT_STORAGE_BUCKET: 'images',
      OBJECT_STORAGE_ACCESS_KEY_ID: 'key-id',
      OBJECT_STORAGE_SECRET_ACCESS_KEY: 'secret',
    };

    it('requires an explicit transfer QR image path', () => {
      expect(() => validateEnvironment(production)).toThrow(
        'TRANSFER_QR_IMAGE_PATH',
      );
    });

    it('starts with the QR image path as the only transfer setting', () => {
      const environment = validateEnvironment({
        ...production,
        TRANSFER_QR_IMAGE_PATH: '/srv/transfer-qr.png',
      });

      expect(environment.TRANSFER_QR_IMAGE_PATH).toBe('/srv/transfer-qr.png');
      expect(environment).not.toHaveProperty('TRANSFER_BENEFICIARY_NAME');
      expect(environment).not.toHaveProperty('TRANSFER_BANK_NAME');
      expect(environment).not.toHaveProperty('TRANSFER_ACCOUNT_NUMBER');
    });

    it('ignores the retired bank-detail variables while they are still set', () => {
      const environment = validateEnvironment({
        ...production,
        TRANSFER_QR_IMAGE_PATH: '/srv/transfer-qr.png',
        TRANSFER_BENEFICIARY_NAME: 'PENDIENTE',
        TRANSFER_BANK_NAME: 'PENDIENTE',
        TRANSFER_ACCOUNT_NUMBER: 'PENDIENTE',
      });

      expect(environment).not.toHaveProperty('TRANSFER_BENEFICIARY_NAME');
    });
  });

  it('accepts only the approved Bs 60 referral reward', () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
        NODE_ENV: 'test',
        REFERRAL_REWARD_CENTAVOS: '5000',
      }),
    ).toThrow('REFERRAL_REWARD_CENTAVOS');
  });

  it('defaults the local upload storage root when not configured', () => {
    const environment = validateEnvironment({
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      NODE_ENV: 'test',
    });

    expect(environment.UPLOADS_LOCAL_STORAGE_ROOT).toBe('.data/uploads');
  });

  describe('admin-web trusted origins', () => {
    const base = {
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      NODE_ENV: 'test',
    };
    const production = {
      ...base,
      NODE_ENV: 'production',
      AUTHENTICATION_EMAIL_DIGEST_KEY: 'x'.repeat(32),
      AUTHENTICATION_LINK_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString(
        'base64',
      ),
      AUTHENTICATION_LINK_ENCRYPTION_KEY_ID: 'prod-v1',
      AUTHENTICATION_LINK_BASE_URL: 'https://links.emmapilates.bo',
      TRANSFER_QR_IMAGE_PATH: '/qr.png',
      OBJECT_STORAGE: 's3',
      OBJECT_STORAGE_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
      OBJECT_STORAGE_BUCKET: 'images',
      OBJECT_STORAGE_ACCESS_KEY_ID: 'key-id',
      OBJECT_STORAGE_SECRET_ACCESS_KEY: 'secret',
    };

    it('trusts the local Vite origin by default outside production', () => {
      expect(validateEnvironment(base).ADMIN_WEB_TRUSTED_ORIGINS).toEqual([
        'http://localhost:5173',
      ]);
    });

    it('reads a comma-separated list of exact origins', () => {
      expect(
        validateEnvironment({
          ...base,
          ADMIN_WEB_TRUSTED_ORIGINS:
            ' https://admin.emmapilates.bo , https://preview-123.vercel.app ',
        }).ADMIN_WEB_TRUSTED_ORIGINS,
      ).toEqual([
        'https://admin.emmapilates.bo',
        'https://preview-123.vercel.app',
      ]);
    });

    it.each([
      'https://*.vercel.app',
      '*',
      'https://admin.emmapilates.bo/',
      'https://admin.emmapilates.bo/path',
      'admin.emmapilates.bo',
      '',
    ])('rejects %p as a trusted origin', (value) => {
      expect(() =>
        validateEnvironment({ ...base, ADMIN_WEB_TRUSTED_ORIGINS: value }),
      ).toThrow('ADMIN_WEB_TRUSTED_ORIGINS');
    });

    it('requires explicit HTTPS origins in production', () => {
      expect(() => validateEnvironment(production)).toThrow(
        'ADMIN_WEB_TRUSTED_ORIGINS',
      );
      expect(() =>
        validateEnvironment({
          ...production,
          ADMIN_WEB_TRUSTED_ORIGINS: 'http://admin.emmapilates.bo',
        }),
      ).toThrow('ADMIN_WEB_TRUSTED_ORIGINS');
      expect(
        validateEnvironment({
          ...production,
          ADMIN_WEB_TRUSTED_ORIGINS: 'https://admin.emmapilates.bo',
        }).ADMIN_WEB_TRUSTED_ORIGINS,
      ).toEqual(['https://admin.emmapilates.bo']);
    });
  });

  describe('ADR-0087 forwarding proxies', () => {
    const base = {
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      NODE_ENV: 'test',
    };

    it('trusts no proxy and no proof by default', () => {
      const environment = validateEnvironment(base);

      expect(environment.TRUSTED_PROXY_HOPS).toBe(0);
      expect(environment.ADMIN_WEB_PROXY_SECRET).toBeNull();
    });

    it('reads the measured hop count and the proof secret', () => {
      const environment = validateEnvironment({
        ...base,
        TRUSTED_PROXY_HOPS: '2',
        ADMIN_WEB_PROXY_SECRET: 's'.repeat(32),
      });

      expect(environment.TRUSTED_PROXY_HOPS).toBe(2);
      expect(environment.ADMIN_WEB_PROXY_SECRET).toBe('s'.repeat(32));
    });

    it('rejects a guessable proof secret', () => {
      expect(() =>
        validateEnvironment({ ...base, ADMIN_WEB_PROXY_SECRET: 'short' }),
      ).toThrow('ADMIN_WEB_PROXY_SECRET');
    });
  });

  describe('ADR-0081 Better Stack monitoring', () => {
    const base = {
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      NODE_ENV: 'test',
    };

    it('reports no errors and pings no heartbeat by default', () => {
      const environment = validateEnvironment(base);

      expect(environment.ERROR_REPORTING_DSN).toBeNull();
      expect(environment.WORKER_HEARTBEAT_URL).toBeNull();
    });

    it('reads the error-reporting DSN and the heartbeat URL', () => {
      const environment = validateEnvironment({
        ...base,
        ERROR_REPORTING_DSN: 'https://token@errors.example.com/1',
        WORKER_HEARTBEAT_URL: 'https://uptime.example.com/api/v1/heartbeat/abc',
      });

      expect(environment.ERROR_REPORTING_DSN).toBe(
        'https://token@errors.example.com/1',
      );
      expect(environment.WORKER_HEARTBEAT_URL).toBe(
        'https://uptime.example.com/api/v1/heartbeat/abc',
      );
    });

    it('reports errors under NODE_ENV by default', () => {
      const environment = validateEnvironment(base);

      expect(environment.ERROR_REPORTING_ENVIRONMENT).toBe('test');
    });

    it('reports errors under the configured environment (EXT-017)', () => {
      const environment = validateEnvironment({
        ...base,
        ERROR_REPORTING_ENVIRONMENT: 'staging',
      });

      expect(environment.ERROR_REPORTING_ENVIRONMENT).toBe('staging');
    });

    it('rejects a heartbeat URL that is not HTTPS', () => {
      expect(() =>
        validateEnvironment({
          ...base,
          WORKER_HEARTBEAT_URL: 'http://uptime.example.com/heartbeat',
        }),
      ).toThrow('WORKER_HEARTBEAT_URL');
    });
  });

  describe('NOT-002 Expo push access token', () => {
    const base = {
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      NODE_ENV: 'test',
    };

    it('sends pushes without a token by default', () => {
      expect(validateEnvironment(base).EXPO_ACCESS_TOKEN).toBeNull();
    });

    it('reads the access token for enhanced push security', () => {
      expect(
        validateEnvironment({ ...base, EXPO_ACCESS_TOKEN: 'expo-token' })
          .EXPO_ACCESS_TOKEN,
      ).toBe('expo-token');
    });

    it('rejects an empty token', () => {
      expect(() =>
        validateEnvironment({ ...base, EXPO_ACCESS_TOKEN: '' }),
      ).toThrow('EXPO_ACCESS_TOKEN');
    });
  });

  describe('ADR-0094 Resend email', () => {
    const base = {
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      NODE_ENV: 'test',
    };

    it('has no API key and the studio sender by default', () => {
      const environment = validateEnvironment(base);

      expect(environment.RESEND_API_KEY).toBeNull();
      expect(environment.EMAIL_FROM).toBe(
        'Emma Pilates Studio <no-responder@emmapilatesstudio.com>',
      );
      expect(environment.EMAIL_REPLY_TO).toBe('soporte@emmapilatesstudio.com');
    });

    it('reads the API key and lets the sender be overridden', () => {
      const environment = validateEnvironment({
        ...base,
        RESEND_API_KEY: 're_key',
        EMAIL_FROM: 'Prueba <prueba@example.com>',
        EMAIL_REPLY_TO: 'ayuda@example.com',
      });

      expect(environment.RESEND_API_KEY).toBe('re_key');
      expect(environment.EMAIL_FROM).toBe('Prueba <prueba@example.com>');
      expect(environment.EMAIL_REPLY_TO).toBe('ayuda@example.com');
    });

    it('reads the webhook secret only in its whsec_ form', () => {
      expect(validateEnvironment(base).RESEND_WEBHOOK_SECRET).toBeNull();
      expect(
        validateEnvironment({ ...base, RESEND_WEBHOOK_SECRET: 'whsec_abc' })
          .RESEND_WEBHOOK_SECRET,
      ).toBe('whsec_abc');
      expect(() =>
        validateEnvironment({ ...base, RESEND_WEBHOOK_SECRET: 'abc' }),
      ).toThrow('RESEND_WEBHOOK_SECRET');
    });

    it('rejects an empty key and a reply-to that is not an address', () => {
      expect(() =>
        validateEnvironment({ ...base, RESEND_API_KEY: '' }),
      ).toThrow('RESEND_API_KEY');
      expect(() =>
        validateEnvironment({ ...base, EMAIL_REPLY_TO: 'soporte' }),
      ).toThrow('EMAIL_REPLY_TO');
    });
  });

  describe('database pool size', () => {
    const base = {
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      NODE_ENV: 'test',
    };

    it("defaults to pg's own pool size", () => {
      expect(validateEnvironment(base).DATABASE_POOL_MAX).toBe(10);
    });

    it('reads a smaller pool for a connection-capped database', () => {
      expect(
        validateEnvironment({ ...base, DATABASE_POOL_MAX: '2' })
          .DATABASE_POOL_MAX,
      ).toBe(2);
    });

    it.each(['0', '1', '21', '1.5'])('rejects a pool size of %s', (value) => {
      expect(() =>
        validateEnvironment({ ...base, DATABASE_POOL_MAX: value }),
      ).toThrow('DATABASE_POOL_MAX');
    });
  });
});
