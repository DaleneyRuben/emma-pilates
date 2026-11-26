import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { readPendingRegistrationStatus } from '../../src/system-identity/registration/prisma-pending-registration-status';
import { PrismaClientRegistrationUnitOfWork } from '../../src/system-identity/registration/prisma-client-registration-unit-of-work';
import { RegisterClient } from '../../src/system-identity/registration/register-client';
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
    await prisma.account.updateMany({
      where: { email },
      data: { emailVerifiedAt: now, pendingExpiresAt: null },
    });

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
