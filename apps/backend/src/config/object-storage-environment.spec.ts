import { validateEnvironment } from './environment';

const local = {
  DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
  NODE_ENV: 'test',
};

const s3 = {
  OBJECT_STORAGE: 's3',
  OBJECT_STORAGE_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
  OBJECT_STORAGE_BUCKET: 'emma-pilates-prod-images',
  OBJECT_STORAGE_ACCESS_KEY_ID: 'key-id',
  OBJECT_STORAGE_SECRET_ACCESS_KEY: 'secret',
};

const production = {
  ...local,
  NODE_ENV: 'production',
  AUTHENTICATION_EMAIL_DIGEST_KEY: 'x'.repeat(32),
  AUTHENTICATION_LINK_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
  AUTHENTICATION_LINK_ENCRYPTION_KEY_ID: 'prod-v1',
  AUTHENTICATION_LINK_BASE_URL: 'https://links.emmapilates.bo',
  ADMIN_WEB_TRUSTED_ORIGINS: 'https://admin.emmapilates.bo',
  TRANSFER_QR_IMAGE_PATH: '/srv/transfer-qr.png',
};

describe('object storage configuration (ADR-0088)', () => {
  it('stores on local disk by default outside production', () => {
    expect(validateEnvironment(local)).toMatchObject({
      OBJECT_STORAGE: 'local',
      UPLOADS_LOCAL_STORAGE_ROOT: '.data/uploads',
    });
  });

  it('reads the S3-compatible settings with the R2 region by default', () => {
    expect(validateEnvironment({ ...local, ...s3 })).toMatchObject({
      ...s3,
      OBJECT_STORAGE_REGION: 'auto',
    });
  });

  it('accepts a plain-HTTP endpoint outside production for a local S3 server', () => {
    const environment = validateEnvironment({
      ...local,
      ...s3,
      OBJECT_STORAGE_ENDPOINT: 'http://127.0.0.1:9000',
    });

    expect(environment.OBJECT_STORAGE_ENDPOINT).toBe('http://127.0.0.1:9000');
  });

  it.each([
    'OBJECT_STORAGE_ENDPOINT',
    'OBJECT_STORAGE_BUCKET',
    'OBJECT_STORAGE_ACCESS_KEY_ID',
    'OBJECT_STORAGE_SECRET_ACCESS_KEY',
  ])('requires %s for S3-compatible storage', (name) => {
    expect(() =>
      validateEnvironment({ ...local, ...s3, [name]: undefined }),
    ).toThrow(name);
  });

  it('refuses local disk storage in production', () => {
    expect(() => validateEnvironment(production)).toThrow('OBJECT_STORAGE');
  });

  it('requires an HTTPS endpoint in production', () => {
    expect(() =>
      validateEnvironment({
        ...production,
        ...s3,
        OBJECT_STORAGE_ENDPOINT: 'http://account.r2.cloudflarestorage.com',
      }),
    ).toThrow('OBJECT_STORAGE_ENDPOINT');
  });

  it('starts in production with S3-compatible storage', () => {
    expect(validateEnvironment({ ...production, ...s3 })).toMatchObject(s3);
  });

  it('rejects an unknown storage kind', () => {
    expect(() =>
      validateEnvironment({ ...local, OBJECT_STORAGE: 'disk' }),
    ).toThrow('OBJECT_STORAGE');
  });
});
