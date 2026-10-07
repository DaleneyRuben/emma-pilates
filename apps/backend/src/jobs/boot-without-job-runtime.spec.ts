import { bootsWithoutJobRuntime } from './boot-without-job-runtime';

describe('bootsWithoutJobRuntime', () => {
  it('boots without the job runtime only when explicitly requested', () => {
    expect(bootsWithoutJobRuntime({ BOOT_WITHOUT_JOB_RUNTIME: 'true' })).toBe(
      true,
    );
    expect(bootsWithoutJobRuntime({ BOOT_WITHOUT_JOB_RUNTIME: 'false' })).toBe(
      false,
    );
    expect(bootsWithoutJobRuntime({})).toBe(false);
  });

  it('ignores the retired OPENAPI_GENERATION name', () => {
    expect(bootsWithoutJobRuntime({ OPENAPI_GENERATION: 'true' })).toBe(false);
  });
});
