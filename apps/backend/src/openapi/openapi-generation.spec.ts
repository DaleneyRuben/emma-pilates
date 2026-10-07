import { isOpenApiGeneration } from './openapi-generation';

describe('isOpenApiGeneration', () => {
  it('boots without the job runtime only when explicitly requested', () => {
    const environment = (values: NodeJS.ProcessEnv) => values;

    expect(
      isOpenApiGeneration(environment({ BOOT_WITHOUT_JOB_RUNTIME: 'true' })),
    ).toBe(true);
    expect(
      isOpenApiGeneration(environment({ BOOT_WITHOUT_JOB_RUNTIME: 'false' })),
    ).toBe(false);
    expect(isOpenApiGeneration(environment({}))).toBe(false);
  });

  it('ignores the retired OPENAPI_GENERATION name', () => {
    expect(isOpenApiGeneration({ OPENAPI_GENERATION: 'true' })).toBe(false);
  });
});
