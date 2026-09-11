import { isOpenApiGeneration } from './openapi-generation';

describe('isOpenApiGeneration', () => {
  it('enables the documentation-only runtime mode only when explicitly requested', () => {
    expect(isOpenApiGeneration({ OPENAPI_GENERATION: 'true' })).toBe(true);
    expect(isOpenApiGeneration({ OPENAPI_GENERATION: 'false' })).toBe(false);
    expect(isOpenApiGeneration({})).toBe(false);
  });
});
