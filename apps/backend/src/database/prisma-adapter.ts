import { PrismaPg } from '@prisma/adapter-pg';
import type { PoolConfig } from 'pg';

// The pg driver adapter maps timestamptz values through the session time zone,
// so every connection pins UTC to keep instants stable on any server.
export const prismaSessionOptions = '-c TimeZone=UTC';

export const prismaPoolConfig = (
  connectionString: string,
  poolMax: number,
  applicationName?: string,
): PoolConfig => ({
  connectionString,
  max: poolMax,
  options: prismaSessionOptions,
  ...(applicationName === undefined
    ? {}
    : { application_name: applicationName }),
});

export const createPrismaAdapter = (
  connectionString: string,
  poolMax = 10,
  applicationName?: string,
): PrismaPg =>
  new PrismaPg(prismaPoolConfig(connectionString, poolMax, applicationName));
