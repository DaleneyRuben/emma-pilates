import { createPrismaAdapter } from './database/prisma-adapter';
import { boliviaDate } from './time/bolivia-time';
import { validateEnvironment } from './config/environment';
import { applyDevelopmentFixtures } from './development-fixtures/apply-development-fixtures';
import {
  buildDevelopmentFixtures,
  DEVELOPMENT_FIXTURE_PASSWORD,
} from './development-fixtures/development-fixtures';
import { PrismaClient } from './generated/prisma/client';
import { hashPassword } from './system-identity/security/argon2-password-hasher';

async function bootstrap(): Promise<void> {
  const environment = validateEnvironment(process.env);

  if (environment.NODE_ENV === 'production') {
    throw new Error(
      'development fixtures never run against a production database. See ADR-0045.',
    );
  }

  const prisma = new PrismaClient({
    adapter: createPrismaAdapter(
      environment.DATABASE_URL,
      environment.DATABASE_POOL_MAX,
    ),
  });

  try {
    const fixtures = buildDevelopmentFixtures({
      today: boliviaDate(new Date()),
    });
    const summary = await applyDevelopmentFixtures(prisma, {
      fixtures,
      passwordHash: await hashPassword(DEVELOPMENT_FIXTURE_PASSWORD),
    });

    console.log(
      JSON.stringify({ event: 'development_fixtures_applied', ...summary }),
    );
    console.log(
      `Password for every fixture Account: ${DEVELOPMENT_FIXTURE_PASSWORD}`,
    );
    for (const member of fixtures.staffMembers) {
      console.log(`${member.role.padEnd(13)} ${member.email}`);
    }
    for (const client of fixtures.clients) {
      console.log(`${'client'.padEnd(13)} ${client.email}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

void bootstrap();
