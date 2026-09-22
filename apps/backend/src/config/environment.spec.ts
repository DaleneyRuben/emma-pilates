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

  it('defaults the transfer instructions and referral reward for local development', () => {
    const environment = validateEnvironment({
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      NODE_ENV: 'test',
    });

    expect(environment).toMatchObject({
      TRANSFER_BENEFICIARY_NAME: 'Emma Pilates Studio',
      TRANSFER_BANK_NAME: 'Banco de desarrollo local',
      TRANSFER_ACCOUNT_NUMBER: '0000000000',
      TRANSFER_QR_IMAGE_PATH: '.data/transfer-qr.png',
      REFERRAL_REWARD_CENTAVOS: 6000,
    });
  });

  it('requires explicit transfer instructions in production', () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
        NODE_ENV: 'production',
        AUTHENTICATION_EMAIL_DIGEST_KEY: 'x'.repeat(32),
        AUTHENTICATION_LINK_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
        AUTHENTICATION_LINK_ENCRYPTION_KEY_ID: 'prod-v1',
      }),
    ).toThrow('TRANSFER_BENEFICIARY_NAME');
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
});
