import type { PgBoss } from 'pg-boss';
import { recordClientAcquisition } from '../../booking/acquisition/record-client-acquisition';
import { attributeReferral } from '../../booking/payments/referral-attribution';
import { toPrismaBytes } from '../../database/prisma-bytes';
import {
  AuthenticationThrottleEventKind,
  AuthenticationThrottlePurpose,
  AuthenticationTokenPurpose,
} from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';
import { scheduleAuthenticationEmail } from '../../jobs/authentication-email/schedule-authentication-email';
import type { AuthenticationEmailJob } from '../../jobs/authentication-email/authentication-email-job';
import type { ClientRegistrationTransaction } from './register-client';
import { authenticationEmailWaitSeconds } from '../security/authentication-email-throttle';

const dayMilliseconds = 24 * 60 * 60 * 1_000;

export class PrismaClientRegistrationTransaction implements ClientRegistrationTransaction {
  constructor(
    private readonly transaction: Prisma.TransactionClient,
    private readonly boss: Pick<PgBoss, 'send'>,
    private readonly digestEmail: (email: string) => Uint8Array,
    private readonly now: () => Date,
  ) {}

  async findAccountByEmail(email: string): Promise<{
    id: string;
    domainIdentity: 'client' | 'staff';
    pendingFlow: 'self_registration' | 'staff_invitation' | 'none';
  } | null> {
    const account = await this.transaction.account.findFirst({
      where: { email, deletedAt: null },
      select: {
        id: true,
        clientId: true,
        staffMemberId: true,
        emailVerifiedAt: true,
        activatedAt: true,
      },
    });

    if (account === null) {
      return null;
    }

    const domainIdentity = account.clientId === null ? 'staff' : 'client';

    if (
      domainIdentity === 'staff' ||
      account.emailVerifiedAt !== null ||
      account.activatedAt !== null
    ) {
      return { id: account.id, domainIdentity, pendingFlow: 'none' };
    }

    const continuation = await this.transaction.authenticationToken.findFirst({
      where: {
        accountId: account.id,
        purpose: AuthenticationTokenPurpose.REGISTRATION_CONTINUATION,
      },
      select: { id: true },
    });

    return {
      id: account.id,
      domainIdentity,
      pendingFlow:
        continuation === null ? 'staff_invitation' : 'self_registration',
    };
  }

  async canIssueAuthenticationEmail(input: {
    email: string;
    purpose: 'verification' | 'activation';
    now: Date;
  }): Promise<boolean> {
    return (await this.authenticationEmailWaitSeconds(input)) === 0;
  }

  async authenticationEmailWaitSeconds(input: {
    email: string;
    purpose: 'verification' | 'activation';
    now: Date;
  }): Promise<number> {
    const events = await this.transaction.authenticationThrottleEvent.findMany({
      where: {
        purpose: mapThrottlePurpose(input.purpose),
        eventKind: AuthenticationThrottleEventKind.MESSAGE_ISSUED,
        recipientDigest: toPrismaBytes(this.digestEmail(input.email)),
        occurredAt: { gte: new Date(input.now.getTime() - dayMilliseconds) },
      },
      select: { occurredAt: true },
    });

    return authenticationEmailWaitSeconds(events, input.now);
  }

  async recordIssuedAuthenticationEmail(input: {
    email: string;
    purpose: 'verification' | 'activation';
    occurredAt: Date;
  }): Promise<void> {
    await this.transaction.authenticationThrottleEvent.create({
      data: {
        purpose: mapThrottlePurpose(input.purpose),
        eventKind: AuthenticationThrottleEventKind.MESSAGE_ISSUED,
        recipientDigest: toPrismaBytes(this.digestEmail(input.email)),
        occurredAt: input.occurredAt,
        expiresAt: new Date(input.occurredAt.getTime() + dayMilliseconds),
      },
    });
  }

  async createSelfRegistration(
    registration: Parameters<
      ClientRegistrationTransaction['createSelfRegistration']
    >[0],
  ): Promise<void> {
    await this.transaction.client.create({
      data: {
        id: registration.clientId,
        name: registration.name,
        referralCode: registration.referralCode,
        account: {
          create: {
            id: registration.accountId,
            email: registration.email,
            passwordHash: registration.passwordHash,
            pendingExpiresAt: registration.pendingExpiresAt,
            authenticationTokens: {
              create: [
                {
                  id: registration.verificationToken.id,
                  purpose: AuthenticationTokenPurpose.VERIFICATION,
                  tokenDigest: toPrismaBytes(
                    registration.verificationToken.digest,
                  ),
                  expiresAt: registration.verificationToken.expiresAt,
                },
                {
                  id: registration.continuationToken.id,
                  purpose: AuthenticationTokenPurpose.REGISTRATION_CONTINUATION,
                  tokenDigest: toPrismaBytes(
                    registration.continuationToken.digest,
                  ),
                  expiresAt: registration.continuationToken.expiresAt,
                },
              ],
            },
          },
        },
      },
    });

    // BKM-011: the code decides the attribution, whoever holds it; only a
    // Client's code also starts the Referral (PAY-001).
    const holder = await recordClientAcquisition(this.transaction, {
      clientId: registration.clientId,
      declaredChannel: registration.acquisitionChannel,
      referralCode: registration.referredByCode,
    });
    if (registration.referredByCode !== null && holder?.kind === 'client') {
      await attributeReferral(this.transaction, {
        referredClientId: registration.clientId,
        referralCode: registration.referredByCode,
      });
    }
  }

  async replaceSelfRegistrationVerification(
    input: Parameters<
      ClientRegistrationTransaction['replaceSelfRegistrationVerification']
    >[0],
  ): Promise<void> {
    const replacedAt = this.now();

    await this.invalidateCurrentToken(
      input.accountId,
      AuthenticationTokenPurpose.VERIFICATION,
      replacedAt,
    );
    await this.transaction.account.update({
      where: { id: input.accountId },
      data: { pendingExpiresAt: input.pendingExpiresAt },
    });
    await this.transaction.authenticationToken.updateMany({
      where: {
        accountId: input.accountId,
        purpose: AuthenticationTokenPurpose.REGISTRATION_CONTINUATION,
        usedAt: null,
        invalidatedAt: null,
      },
      data: { expiresAt: input.pendingExpiresAt },
    });
    await this.createToken(
      input.accountId,
      AuthenticationTokenPurpose.VERIFICATION,
      input.verificationToken,
    );
  }

  async replaceStaffInvitationActivation(
    input: Parameters<
      ClientRegistrationTransaction['replaceStaffInvitationActivation']
    >[0],
  ): Promise<void> {
    await this.invalidateCurrentToken(
      input.accountId,
      AuthenticationTokenPurpose.ACTIVATION,
      this.now(),
    );
    await this.transaction.account.update({
      where: { id: input.accountId },
      data: { pendingExpiresAt: input.pendingExpiresAt },
    });
    await this.createToken(
      input.accountId,
      AuthenticationTokenPurpose.ACTIVATION,
      input.activationToken,
    );
  }

  async scheduleAuthenticationEmail(
    job: AuthenticationEmailJob,
  ): Promise<void> {
    await scheduleAuthenticationEmail(this.boss, this.transaction, job);
  }

  private async invalidateCurrentToken(
    accountId: string,
    purpose: AuthenticationTokenPurpose,
    invalidatedAt: Date,
  ): Promise<void> {
    await this.transaction.authenticationToken.updateMany({
      where: { accountId, purpose, usedAt: null, invalidatedAt: null },
      data: { invalidatedAt },
    });
  }

  private async createToken(
    accountId: string,
    purpose: AuthenticationTokenPurpose,
    token: { id: string; digest: Uint8Array; expiresAt: Date },
  ): Promise<void> {
    await this.transaction.authenticationToken.create({
      data: {
        id: token.id,
        accountId,
        purpose,
        tokenDigest: toPrismaBytes(token.digest),
        expiresAt: token.expiresAt,
      },
    });
  }
}

const mapThrottlePurpose = (
  purpose: 'verification' | 'activation',
): AuthenticationThrottlePurpose =>
  purpose === 'verification'
    ? AuthenticationThrottlePurpose.VERIFICATION
    : AuthenticationThrottlePurpose.ACTIVATION;
