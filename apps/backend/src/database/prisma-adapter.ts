import { PrismaPg } from '@prisma/adapter-pg';

// The pg driver adapter maps timestamptz values through the session time zone,
// so every connection pins UTC to keep instants stable on any server.
export const prismaSessionOptions = '-c TimeZone=UTC';

export const createPrismaAdapter = (connectionString: string): PrismaPg =>
  new PrismaPg({ connectionString, options: prismaSessionOptions });
