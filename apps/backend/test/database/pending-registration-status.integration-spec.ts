import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { readPendingRegistrationStatus } from '../../src/system-identity/registration/prisma-pending-registration-status';
import { PrismaClientRegistrationUnitOfWork } from '../../src/system-identity/registration/prisma-client-registration-unit-of-work';
import { RegisterClient } from '../../src/system-identity/registration/register-client';
import { VerifyClientEmail } from '../../src/system-identity/registration/verify-client-email';
import {
  AUTHENTICATION_EMAIL_QUEUE,
  parseAuthenticationEmailJob,
} from '../../src/jobs/authentication-email/authentication-email-job';
import { AuthenticationLinkCipher } from '../../src/system-identity/security/authentication-link-cipher';
import { authenticationTokens } from '../../src/system-identity/security/authentication-token-service';
import {
  digestTestEmail,
  RegistrationWorld,
  startRegistrationWorld,
} from './client-registration-test-support';

const now = new Date(Date.now() + 60_000);

// Walkthrough n.º 4 (C01c2): «Revisa tu correo» asks on opening whether the
// email was confirmed meanwhile (on another phone or in a browser), and then
// leads to Login instead of waiting.
describe('the status of a pending Client registration', () => {
  let world: RegistrationWorld;
  let prisma: PrismaClient;

  beforeAll(async () => {
    world = await startRegistrationWorld();
    prisma = world.prisma;
  });

  afterAll(async () => {
    await world?.stop();
  });

  const register = () =>
    new RegisterClient({
      unitOfWork: new PrismaClientRegistrationUnitOfWork({
        prisma,
        boss: world.boss,
        digestEmail: digestTestEmail,
        now: () => now,
      }),
      passwordHasher: { hash: () => Promise.resolve('argon2id-hash') },
      tokenIssuer: authenticationTokens,
      linkCipher: new AuthenticationLinkCipher(
        'local-test-key',
        Buffer.alloc(32, 7),
      ),
      now: () => now,
      newId: randomUUID,
    }).execute({
      name: 'Carla Pendiente',
      email: `carla-${randomUUID()}@example.com`,
      password: 'correct horse battery staple',
    });

  // Confirms the email the way the link does, so every token is handled as
  // in production (review: verification invalidates the continuation).
  const confirm = async (email: string) => {
    const account = await prisma.account.findFirstOrThrow({
      where: { email, deletedAt: null },
      select: { id: true },
    });
    const jobs = await world.boss.findJobs(AUTHENTICATION_EMAIL_QUEUE, {
      id: undefined,
    });
    const job = parseAuthenticationEmailJob(
      jobs.find(
        ({ data }) =>
          typeof data === 'object' &&
          data !== null &&
          'accountId' in data &&
          data.accountId === account.id,
      )?.data,
    );
    const secret = await new AuthenticationLinkCipher(
      'local-test-key',
      Buffer.alloc(32, 7),
    ).decrypt(job.encryptedLinkSecret, job.encryptionKeyId);
    await new VerifyClientEmail({
      gateway: new PrismaClientRegistrationUnitOfWork({
        prisma,
        boss: world.boss,
        digestEmail: digestTestEmail,
        now: () => now,
      }),
      tokens: authenticationTokens,
      now: () => now,
    }).execute({ verificationToken: secret });
  };

  const statusOf = (registrationContinuation: string, at = now) =>
    readPendingRegistrationStatus(prisma, {
      registrationContinuation,
      now: at,
    });

  it('answers pending while the email waits for its link', async () => {
    const { registrationContinuation } = await register();

    await expect(statusOf(registrationContinuation)).resolves.toBe('pending');
  });

  it('answers verified once the email was confirmed', async () => {
    const { email, registrationContinuation } = await register();
    await confirm(email);

    await expect(statusOf(registrationContinuation)).resolves.toBe('verified');
  });

  it('answers expired for an unknown continuation or after the window', async () => {
    const { registrationContinuation } = await register();

    await expect(statusOf('not-a-continuation')).resolves.toBe('expired');
    await expect(
      statusOf(
        registrationContinuation,
        new Date(now.getTime() + 8 * 24 * 60 * 60 * 1_000),
      ),
    ).resolves.toBe('expired');
  });
});
