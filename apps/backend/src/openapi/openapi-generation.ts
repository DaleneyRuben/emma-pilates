export const isOpenApiGeneration = (
  environment: Readonly<Record<string, string | undefined>>,
): boolean => environment.BOOT_WITHOUT_JOB_RUNTIME === 'true';
