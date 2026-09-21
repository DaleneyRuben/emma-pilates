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

  it('defaults the local upload storage root when not configured', () => {
    const environment = validateEnvironment({
      DATABASE_URL: 'postgresql://unused:unused@localhost:5432/unused',
      NODE_ENV: 'test',
    });

    expect(environment.UPLOADS_LOCAL_STORAGE_ROOT).toBe('.data/uploads');
  });
});
