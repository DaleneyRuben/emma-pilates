import { prismaPoolConfig, prismaSessionOptions } from './prisma-adapter';

describe('Prisma adapter pool', () => {
  it('caps the pool at the configured size and pins UTC sessions', () => {
    expect(prismaPoolConfig('postgresql://localhost/pilates', 2)).toEqual({
      connectionString: 'postgresql://localhost/pilates',
      max: 2,
      options: prismaSessionOptions,
    });
  });
});
