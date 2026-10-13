import { prismaPoolConfig, prismaSessionOptions } from './prisma-adapter';

describe('Prisma adapter pool', () => {
  it('caps the pool at the configured size and pins UTC sessions', () => {
    expect(prismaPoolConfig('postgresql://localhost/pilates', 2)).toEqual({
      connectionString: 'postgresql://localhost/pilates',
      max: 2,
      options: prismaSessionOptions,
    });
  });

  it('tags connections with the owning process', () => {
    expect(
      prismaPoolConfig(
        'postgresql://localhost/pilates',
        3,
        'pilates-api-prisma',
      ),
    ).toMatchObject({ max: 3, application_name: 'pilates-api-prisma' });
  });
});
