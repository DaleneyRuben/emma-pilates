import { servesApiDocumentation } from './configure-application';

describe('BE-025 API documentation switch', () => {
  it('serves Swagger locally and in tests', () => {
    expect(
      servesApiDocumentation({
        NODE_ENV: 'development',
        ERROR_REPORTING_ENVIRONMENT: 'development',
      }),
    ).toBe(true);
    expect(
      servesApiDocumentation({
        NODE_ENV: 'test',
        ERROR_REPORTING_ENVIRONMENT: 'test',
      }),
    ).toBe(true);
  });

  it('serves Swagger on staging, which runs as production', () => {
    expect(
      servesApiDocumentation({
        NODE_ENV: 'production',
        ERROR_REPORTING_ENVIRONMENT: 'staging',
      }),
    ).toBe(true);
  });

  it('hides Swagger in production and in any other production-mode environment', () => {
    expect(
      servesApiDocumentation({
        NODE_ENV: 'production',
        ERROR_REPORTING_ENVIRONMENT: 'production',
      }),
    ).toBe(false);
    expect(
      servesApiDocumentation({
        NODE_ENV: 'production',
        ERROR_REPORTING_ENVIRONMENT: 'preview',
      }),
    ).toBe(false);
  });
});
