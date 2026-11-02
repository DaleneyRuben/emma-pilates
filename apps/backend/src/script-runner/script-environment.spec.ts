import { validateScriptEnvironment } from './script-environment';

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
