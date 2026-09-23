import { createHmac, randomUUID } from 'node:crypto';
import { validateEnvironment } from './config/environment';
import { createPrismaAdapter } from './database/prisma-adapter';
import { PrismaClient } from './generated/prisma/client';
import { createPgBoss, startInstalledPgBoss } from './jobs/pg-boss-runtime';
import { runAdministratorBootstrapCommand } from './system-identity/bootstrap/administrator-bootstrap-command';
import { bootstrapFirstAdministrator } from './system-identity/bootstrap/bootstrap-first-administrator';
import { PrismaAdministratorBootstrapUnitOfWork } from './system-identity/bootstrap/prisma-administrator-bootstrap-unit-of-work';
import { AuthenticationLinkCipher } from './system-identity/security/authentication-link-cipher';
import { authenticationTokens } from './system-identity/security/authentication-token-service';

// First-Administrator bootstrap (ADR-0083); see
// docs/runbooks/first-administrator-bootstrap.md.
async function main(): Promise<void> {
  const environment = validateEnvironment(process.env);
  const prisma = new PrismaClient({
    adapter: createPrismaAdapter(environment.DATABASE_URL),
  });
  const boss = await createPgBoss(environment.DATABASE_URL);

  try {
    await startInstalledPgBoss(boss);
    const linkCipher = new AuthenticationLinkCipher(
      environment.AUTHENTICATION_LINK_ENCRYPTION_KEY_ID,
      Buffer.from(environment.AUTHENTICATION_LINK_ENCRYPTION_KEY, 'base64'),
    );
    process.exitCode = await runAdministratorBootstrapCommand(process.env, {
      bootstrap: (command) =>
        bootstrapFirstAdministrator(command, {
          unitOfWork: new PrismaAdministratorBootstrapUnitOfWork({
            prisma,
            boss,
            digestEmail: (email) =>
              createHmac('sha256', environment.AUTHENTICATION_EMAIL_DIGEST_KEY)
                .update(email)
                .digest(),
          }),
          tokenIssuer: authenticationTokens,
          linkCipher,
          now: () => new Date(),
          newId: randomUUID,
        }),
      report: (report) => console.log(JSON.stringify(report)),
    });
  } finally {
    await boss.stop({ graceful: true });
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: 'administrator_bootstrap_failed',
      type: error instanceof Error ? error.name : typeof error,
    }),
  );
  process.exitCode = 1;
});
