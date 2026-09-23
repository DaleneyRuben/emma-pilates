import type { AuthenticationEmailJob } from '../../jobs/authentication-email/authentication-email-job';
import type { EncryptedAuthenticationLink } from '../security/authentication-link-cipher';
import type { IssuedAuthenticationToken } from '../security/authentication-token-service';

// ADR-0083: the first Administrator activates through the same 7-day
// Activation Link and 30-day pending window as any staff-created Account.
const activationLifetimeMilliseconds = 7 * 24 * 60 * 60 * 1_000;
const pendingLifetimeMilliseconds = 30 * 24 * 60 * 60 * 1_000;

export class AdministratorAlreadyActiveError extends Error {
  constructor() {
    super('An activated Administrator already exists');
  }
}

export class BootstrapPendingForAnotherEmailError extends Error {
  constructor() {
    super('A bootstrap Administrator is already pending for another email');
  }
}

export class BootstrapEmailInUseError extends Error {
  constructor() {
    super('Email already belongs to another Account');
  }
}

export class BootstrapEmailThrottledError extends Error {
  constructor() {
    super('Too many emails were sent to this recipient');
  }
}

type StoredAuthenticationToken = {
  id: string;
  digest: Uint8Array;
  expiresAt: Date;
};

export type AdministratorAccount = {
  accountId: string;
  staffMemberId: string;
  email: string;
  activated: boolean;
};

export type AdministratorBootstrapAudit = {
  actionCode:
    | 'administrator_bootstrap.created'
    | 'administrator_bootstrap.activation_resent';
  targetAccountId: string;
  correlationId: string;
  occurredAt: Date;
};

export interface AdministratorBootstrapTransaction {
  // Serializes concurrent bootstrap runs so two cannot both see no
  // Administrator and each create one.
  lockBootstrap: () => Promise<void>;
  findAdministratorAccounts: () => Promise<AdministratorAccount[]>;
  findAccountByEmail: (email: string) => Promise<{ id: string } | null>;
  canIssueAuthenticationEmail: (input: {
    email: string;
    purpose: 'activation';
    now: Date;
  }) => Promise<boolean>;
  recordIssuedAuthenticationEmail: (input: {
    email: string;
    purpose: 'activation';
    occurredAt: Date;
  }) => Promise<void>;
  createPendingAdministrator: (input: {
    accountId: string;
    staffMemberId: string;
    name: string;
    email: string;
    pendingExpiresAt: Date;
    activationToken: StoredAuthenticationToken;
  }) => Promise<void>;
  replaceStaffInvitationActivation: (input: {
    accountId: string;
    pendingExpiresAt: Date;
    activationToken: StoredAuthenticationToken;
  }) => Promise<void>;
  scheduleAuthenticationEmail: (job: AuthenticationEmailJob) => Promise<void>;
  recordAudit: (audit: AdministratorBootstrapAudit) => Promise<void>;
}

export interface AdministratorBootstrapUnitOfWork {
  execute: <Result>(
    work: (transaction: AdministratorBootstrapTransaction) => Promise<Result>,
  ) => Promise<Result>;
}

export type AdministratorBootstrapDependencies = {
  unitOfWork: AdministratorBootstrapUnitOfWork;
  tokenIssuer: { issue: () => IssuedAuthenticationToken };
  linkCipher: { encrypt: (secret: string) => EncryptedAuthenticationLink };
  now: () => Date;
  newId: () => string;
};

export type BootstrapAdministratorResult = {
  status: 'created' | 'activation_resent';
  accountId: string;
  staffMemberId: string;
  email: string;
  activationExpiresAt: Date;
};

export const bootstrapFirstAdministrator = async (
  command: { email: string; name: string },
  dependencies: AdministratorBootstrapDependencies,
): Promise<BootstrapAdministratorResult> => {
  const now = dependencies.now();
  const email = command.email.trim().toLowerCase();

  return dependencies.unitOfWork.execute(async (transaction) => {
    await transaction.lockBootstrap();
    const administrators = await transaction.findAdministratorAccounts();
    if (administrators.some(({ activated }) => activated)) {
      throw new AdministratorAlreadyActiveError();
    }
    const pending = administrators.find(
      (administrator) => administrator.email === email,
    );
    if (pending === undefined && administrators.length > 0) {
      throw new BootstrapPendingForAnotherEmailError();
    }
    const existing = await transaction.findAccountByEmail(email);
    if (existing !== null && existing.id !== pending?.accountId) {
      throw new BootstrapEmailInUseError();
    }
    if (
      !(await transaction.canIssueAuthenticationEmail({
        email,
        purpose: 'activation',
        now,
      }))
    ) {
      throw new BootstrapEmailThrottledError();
    }

    const accountId = pending?.accountId ?? dependencies.newId();
    const staffMemberId = pending?.staffMemberId ?? dependencies.newId();
    const token = dependencies.tokenIssuer.issue();
    const activationToken: StoredAuthenticationToken = {
      id: dependencies.newId(),
      digest: token.digest,
      expiresAt: new Date(now.getTime() + activationLifetimeMilliseconds),
    };
    const pendingExpiresAt = new Date(
      now.getTime() + pendingLifetimeMilliseconds,
    );

    if (pending === undefined) {
      await transaction.createPendingAdministrator({
        accountId,
        staffMemberId,
        name: command.name.trim(),
        email,
        pendingExpiresAt,
        activationToken,
      });
    } else {
      await transaction.replaceStaffInvitationActivation({
        accountId,
        pendingExpiresAt,
        activationToken,
      });
    }

    const link = dependencies.linkCipher.encrypt(token.secret);
    await transaction.recordIssuedAuthenticationEmail({
      email,
      purpose: 'activation',
      occurredAt: now,
    });
    await transaction.scheduleAuthenticationEmail({
      version: 1,
      accountId,
      authenticationTokenId: activationToken.id,
      purpose: 'activation',
      encryptedLinkSecret: link.encryptedLinkSecret,
      encryptionKeyId: link.encryptionKeyId,
    });
    const status = pending === undefined ? 'created' : 'activation_resent';
    await transaction.recordAudit({
      actionCode: `administrator_bootstrap.${status}`,
      targetAccountId: accountId,
      correlationId: dependencies.newId(),
      occurredAt: now,
    });

    return {
      status,
      accountId,
      staffMemberId,
      email,
      activationExpiresAt: activationToken.expiresAt,
    };
  });
};
