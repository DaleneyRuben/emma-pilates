import { validateEnvironment } from './config/environment';
import { createDatabaseClients } from './database/database-clients';
import { AUTHENTICATION_EMAIL_QUEUE } from './jobs/authentication-email/authentication-email-job';
import { PrismaAuthenticationEmailStateReader } from './jobs/authentication-email/prisma-authentication-email-state-reader';
import { startInstalledPgBoss } from './jobs/pg-boss-runtime';
import { readQueuedActivationLink } from './system-identity/bootstrap/queued-activation-link';
import { AuthenticationLinkCipher } from './system-identity/security/authentication-link-cipher';

// EXT-002: until EXT-001 sends email, an operator prints the first
// Administrator's queued Activation Link from the API's shell after running
// administrator-bootstrap-main; see docs/runbooks/first-administrator-bootstrap.md.
// The link is a credential: it is printed to this terminal only.
async function main(): Promise<void> {
  const environment = validateEnvironment(process.env);
  const { prisma, boss } = createDatabaseClients(
    'administrator-bootstrap',
    environment,
  );

  try {
    await startInstalledPgBoss(boss);
    const link = await readQueuedActivationLink({
      queuedActivationJobs: () =>
        boss.findJobs(AUTHENTICATION_EMAIL_QUEUE, {
          data: { purpose: 'activation' },
          queued: true,
        }),
      stateReader: new PrismaAuthenticationEmailStateReader(prisma),
      decryptor: new AuthenticationLinkCipher(
        environment.AUTHENTICATION_LINK_ENCRYPTION_KEY_ID,
        Buffer.from(environment.AUTHENTICATION_LINK_ENCRYPTION_KEY, 'base64'),
      ),
      adminWebOrigin: environment.ADMIN_WEB_TRUSTED_ORIGINS[0],
      now: new Date(),
    });
    console.log(
      JSON.stringify(
        link === null
          ? { event: 'activation_link_not_found' }
          : { event: 'activation_link_found', link },
      ),
    );
    process.exitCode = link === null ? 1 : 0;
  } finally {
    await boss.stop({ graceful: true });
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      event: 'activation_link_failed',
      type: error instanceof Error ? error.name : typeof error,
    }),
  );
  process.exitCode = 1;
});
