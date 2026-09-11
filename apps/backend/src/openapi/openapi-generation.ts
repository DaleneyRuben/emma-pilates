export const isOpenApiGeneration = (environment: {
  OPENAPI_GENERATION?: string;
}): boolean => environment.OPENAPI_GENERATION === 'true';
