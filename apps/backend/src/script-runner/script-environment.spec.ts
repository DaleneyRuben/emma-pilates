import {
  scriptAuthenticationKeys,
  validateScriptEnvironment,
} from './script-environment';

// The migrate job carries the secret group but not the API's service
// variables, such as AUTHENTICATION_LINK_BASE_URL (REL-016 review).
const migrateJob = {
  NODE_ENV: 'production',
  DATABASE_URL:
    'postgresql://avnadmin:secret@db.example.aivencloud.com:20680/emma?sslmode=verify-full',
  DATABASE_POOL_MAX: '4',
};

describe('the script runner environment (REL-016)', () => {
  it('needs only the database the migrate job already has', () => {
    expect(validateScriptEnvironment(migrateJob)).toEqual({
      DATABASE_URL: migrateJob.DATABASE_URL,
      DATABASE_POOL_MAX: 4,
    });
  });

  it('holds two connections when the pool size is not set', () => {
    expect(
      validateScriptEnvironment({ DATABASE_URL: migrateJob.DATABASE_URL })
        .DATABASE_POOL_MAX,
    ).toBe(2);
  });

  it.each([
    [{}],
    [{ DATABASE_URL: 'mysql://db.example.com/emma' }],
    [{ ...migrateJob, DATABASE_POOL_MAX: '50' }],
  ])('refuses %j', (values) => {
    expect(() => validateScriptEnvironment(values)).toThrow();
  });
});

// A script that invites people queues the same Activation Link email the API
// does, so it needs the secret group's keys, never the local defaults.
describe('the script runner authentication keys', () => {
  const keys = {
    AUTHENTICATION_EMAIL_DIGEST_KEY: 'd'.repeat(40),
    AUTHENTICATION_LINK_ENCRYPTION_KEY: Buffer.alloc(32, 3).toString('base64'),
    AUTHENTICATION_LINK_ENCRYPTION_KEY_ID: 'production-v1',
  };

  it('reads the three keys the secret group carries', () => {
    expect(scriptAuthenticationKeys({ ...migrateJob, ...keys })).toEqual({
      emailDigestKey: keys.AUTHENTICATION_EMAIL_DIGEST_KEY,
      linkEncryptionKey: Buffer.alloc(32, 3),
      linkEncryptionKeyId: 'production-v1',
    });
  });

  it('has none when the job carries none', () => {
    expect(scriptAuthenticationKeys(migrateJob)).toBeNull();
  });

  it.each([
    [{ ...keys, AUTHENTICATION_LINK_ENCRYPTION_KEY_ID: undefined }],
    [{ ...keys, AUTHENTICATION_EMAIL_DIGEST_KEY: 'short' }],
    [{ ...keys, AUTHENTICATION_LINK_ENCRYPTION_KEY: 'AAAA' }],
  ])('refuses a partial or invalid set %#', (values) => {
    expect(() =>
      scriptAuthenticationKeys({ ...migrateJob, ...values }),
    ).toThrow();
  });
});
