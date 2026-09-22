import type { AuthenticationEmailJob } from '../../jobs/authentication-email/authentication-email-job';
import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import type { EncryptedAuthenticationLink } from '../security/authentication-link-cipher';
import type { IssuedAuthenticationToken } from '../security/authentication-token-service';

// ADR-0029: an invited Account activates through a 7-day link and the
// invitation itself stays pending for 30 days after the last update or
// resend; a self-registered pending Account keeps its 24-hour verification
// link and its 7-day pending window instead.
const activationLifetimeMilliseconds = 7 * 24 * 60 * 60 * 1_000;
const pendingInvitationLifetimeMilliseconds = 30 * 24 * 60 * 60 * 1_000;
const verificationLifetimeMilliseconds = 24 * 60 * 60 * 1_000;
const pendingRegistrationLifetimeMilliseconds = 7 * 24 * 60 * 60 * 1_000;

export class InvitationAccessDeniedError extends Error {
  constructor() {
    super('Client invitation access is denied');
  }
}

export class ClientInvitationNotFoundError extends Error {
  constructor() {
    super('Client invitation not found');
  }
}

export class InvitationEmailInUseError extends Error {
  constructor() {
    super('Email already belongs to another Account');
  }
}

export class InvitationEmailThrottledError extends Error {
  constructor() {
    super('Too many emails were sent to this recipient');
  }
}

export class InvitationHasActivityError extends Error {
  constructor() {
    super('Client already has Payments or Bookings');
  }
}

type StoredAuthenticationToken = {
  id: string;
  digest: Uint8Array;
  expiresAt: Date;
};

type EmailPurpose = 'verification' | 'activation';

export type ExistingAccount = {
  id: string;
  clientId: string | null;
  domainIdentity: 'client' | 'staff';
  pendingFlow: 'self_registration' | 'staff_invitation' | 'none';
};

export type ClientInvitationRecord = {
  accountId: string;
  clientId: string;
  name: string;
  email: string;
  phone: string | null;
  pendingExpiresAt: Date;
  activationExpiresAt: Date | null;
  hasActivity: boolean;
};

export type InvitationAudit = {
  actionCode:
    | 'client_invitation.created'
    | 'client_invitation.resent'
    | 'client_invitation.email_corrected'
    | 'client_invitation.cancelled';
  actorAccountId: string;
  actorRole: 'assistant' | 'administrator';
  targetAccountId: string;
  correlationId: string;
  metadata: Record<string, string> | null;
  occurredAt: Date;
};

export interface ClientInvitationTransaction {
  findAccountByEmail: (email: string) => Promise<ExistingAccount | null>;
  findInvitation: (clientId: string) => Promise<ClientInvitationRecord | null>;
  canIssueAuthenticationEmail: (input: {
    email: string;
    purpose: EmailPurpose;
    now: Date;
  }) => Promise<boolean>;
  recordIssuedAuthenticationEmail: (input: {
    email: string;
    purpose: EmailPurpose;
    occurredAt: Date;
  }) => Promise<void>;
  createInvitation: (invitation: {
    accountId: string;
    clientId: string;
    name: string;
    email: string;
    phone: string | null;
    referralCode: string;
    pendingExpiresAt: Date;
    activationToken: StoredAuthenticationToken;
  }) => Promise<void>;
  replaceStaffInvitationActivation: (input: {
    accountId: string;
    pendingExpiresAt: Date;
    activationToken: StoredAuthenticationToken;
  }) => Promise<void>;
  replaceSelfRegistrationVerification: (input: {
    accountId: string;
    pendingExpiresAt: Date;
    verificationToken: StoredAuthenticationToken;
  }) => Promise<void>;
  changeInvitationEmail: (input: {
    accountId: string;
    email: string;
  }) => Promise<void>;
  deleteInvitation: (input: {
    accountId: string;
    clientId: string;
  }) => Promise<void>;
  scheduleAuthenticationEmail: (job: AuthenticationEmailJob) => Promise<void>;
  recordAudit: (audit: InvitationAudit) => Promise<void>;
}

export interface ClientInvitationUnitOfWork {
  execute: <Result>(
    work: (transaction: ClientInvitationTransaction) => Promise<Result>,
  ) => Promise<Result>;
}

export type ClientInvitationDependencies = {
  unitOfWork: ClientInvitationUnitOfWork;
  tokenIssuer: { issue: () => IssuedAuthenticationToken };
  linkCipher: { encrypt: (secret: string) => EncryptedAuthenticationLink };
  now: () => Date;
  newId: () => string;
  newReferralCode: () => string;
};

export type ClientInvitationView = {
  clientId: string;
  name: string;
  email: string;
  phone: string | null;
  pendingExpiresAt: Date;
  activationExpiresAt: Date | null;
  cancellable: boolean;
};

export type InviteClientResult = {
  status: 'invited' | 'invitation_resent' | 'verification_pending';
  clientId: string;
  email: string;
};

type Actor = { accountId: string; role: 'assistant' | 'administrator' };

const requireAssistant = (principal: AuthenticatedPrincipal): Actor => {
  if (
    principal.identity.kind !== 'staff' ||
    (principal.identity.role !== 'assistant' &&
      principal.identity.role !== 'administrator')
  ) {
    throw new InvitationAccessDeniedError();
  }
  return { accountId: principal.accountId, role: principal.identity.role };
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const toView = (record: ClientInvitationRecord): ClientInvitationView => ({
  clientId: record.clientId,
  name: record.name,
  email: record.email,
  phone: record.phone,
  pendingExpiresAt: record.pendingExpiresAt,
  activationExpiresAt: record.activationExpiresAt,
  cancellable: !record.hasActivity,
});

// One link issue: a fresh token, its encrypted link, and the queued email,
// all recorded against the recipient throttle inside the transaction.
const issueLink = (dependencies: ClientInvitationDependencies, now: Date) => {
  const token = dependencies.tokenIssuer.issue();
  const tokenId = dependencies.newId();
  const link = dependencies.linkCipher.encrypt(token.secret);

  return {
    stored: (lifetimeMilliseconds: number): StoredAuthenticationToken => ({
      id: tokenId,
      digest: token.digest,
      expiresAt: new Date(now.getTime() + lifetimeMilliseconds),
    }),
    send: async (
      transaction: ClientInvitationTransaction,
      input: { accountId: string; email: string; purpose: EmailPurpose },
    ): Promise<void> => {
      await transaction.recordIssuedAuthenticationEmail({
        email: input.email,
        purpose: input.purpose,
        occurredAt: now,
      });
      await transaction.scheduleAuthenticationEmail({
        version: 1,
        accountId: input.accountId,
        authenticationTokenId: tokenId,
        purpose: input.purpose,
        encryptedLinkSecret: link.encryptedLinkSecret,
        encryptionKeyId: link.encryptionKeyId,
      });
    },
  };
};

const requireThrottleRoom = async (
  transaction: ClientInvitationTransaction,
  input: { email: string; purpose: EmailPurpose; now: Date },
): Promise<void> => {
  if (!(await transaction.canIssueAuthenticationEmail(input))) {
    throw new InvitationEmailThrottledError();
  }
};

const requireInvitation = async (
  transaction: ClientInvitationTransaction,
  clientId: string,
): Promise<ClientInvitationRecord> => {
  const invitation = await transaction.findInvitation(clientId);
  if (invitation === null) throw new ClientInvitationNotFoundError();
  return invitation;
};

const audit = (
  actor: Actor,
  dependencies: ClientInvitationDependencies,
  input: {
    actionCode: InvitationAudit['actionCode'];
    targetAccountId: string;
    occurredAt: Date;
    metadata?: Record<string, string>;
  },
): InvitationAudit => ({
  actionCode: input.actionCode,
  actorAccountId: actor.accountId,
  actorRole: actor.role,
  targetAccountId: input.targetAccountId,
  correlationId: dependencies.newId(),
  metadata: input.metadata ?? null,
  occurredAt: input.occurredAt,
});

// Renews the activation link and the 30-day pending window of an invitation.
const renewActivation = async (
  transaction: ClientInvitationTransaction,
  dependencies: ClientInvitationDependencies,
  input: { accountId: string; email: string; now: Date },
): Promise<{ pendingExpiresAt: Date; activationExpiresAt: Date }> => {
  await requireThrottleRoom(transaction, {
    email: input.email,
    purpose: 'activation',
    now: input.now,
  });
  const link = issueLink(dependencies, input.now);
  const activationToken = link.stored(activationLifetimeMilliseconds);
  const pendingExpiresAt = new Date(
    input.now.getTime() + pendingInvitationLifetimeMilliseconds,
  );
  await transaction.replaceStaffInvitationActivation({
    accountId: input.accountId,
    pendingExpiresAt,
    activationToken,
  });
  await link.send(transaction, {
    accountId: input.accountId,
    email: input.email,
    purpose: 'activation',
  });
  return { pendingExpiresAt, activationExpiresAt: activationToken.expiresAt };
};

export const inviteClient = async (
  command: { name: string; email: string; phone: string | null },
  principal: AuthenticatedPrincipal,
  dependencies: ClientInvitationDependencies,
): Promise<InviteClientResult> => {
  const actor = requireAssistant(principal);
  const now = dependencies.now();
  const email = normalizeEmail(command.email);

  return dependencies.unitOfWork.execute(async (transaction) => {
    const existing = await transaction.findAccountByEmail(email);

    if (existing === null) {
      await requireThrottleRoom(transaction, {
        email,
        purpose: 'activation',
        now,
      });
      const accountId = dependencies.newId();
      const clientId = dependencies.newId();
      const link = issueLink(dependencies, now);
      await transaction.createInvitation({
        accountId,
        clientId,
        name: command.name.trim(),
        email,
        phone: command.phone,
        referralCode: dependencies.newReferralCode(),
        pendingExpiresAt: new Date(
          now.getTime() + pendingInvitationLifetimeMilliseconds,
        ),
        activationToken: link.stored(activationLifetimeMilliseconds),
      });
      await link.send(transaction, { accountId, email, purpose: 'activation' });
      await transaction.recordAudit(
        audit(actor, dependencies, {
          actionCode: 'client_invitation.created',
          targetAccountId: accountId,
          occurredAt: now,
        }),
      );
      return { status: 'invited', clientId, email };
    }

    if (existing.domainIdentity !== 'client' || existing.clientId === null) {
      throw new InvitationEmailInUseError();
    }

    if (existing.pendingFlow === 'staff_invitation') {
      await renewActivation(transaction, dependencies, {
        accountId: existing.id,
        email,
        now,
      });
      await transaction.recordAudit(
        audit(actor, dependencies, {
          actionCode: 'client_invitation.resent',
          targetAccountId: existing.id,
          occurredAt: now,
        }),
      );
      return {
        status: 'invitation_resent',
        clientId: existing.clientId,
        email,
      };
    }

    if (existing.pendingFlow === 'self_registration') {
      await requireThrottleRoom(transaction, {
        email,
        purpose: 'verification',
        now,
      });
      const link = issueLink(dependencies, now);
      await transaction.replaceSelfRegistrationVerification({
        accountId: existing.id,
        pendingExpiresAt: new Date(
          now.getTime() + pendingRegistrationLifetimeMilliseconds,
        ),
        verificationToken: link.stored(verificationLifetimeMilliseconds),
      });
      await link.send(transaction, {
        accountId: existing.id,
        email,
        purpose: 'verification',
      });
      return {
        status: 'verification_pending',
        clientId: existing.clientId,
        email,
      };
    }

    throw new InvitationEmailInUseError();
  });
};

export const readClientInvitation = async (
  command: { clientId: string },
  principal: AuthenticatedPrincipal,
  dependencies: ClientInvitationDependencies,
): Promise<ClientInvitationView> => {
  requireAssistant(principal);
  return dependencies.unitOfWork.execute(async (transaction) =>
    toView(await requireInvitation(transaction, command.clientId)),
  );
};

export const correctClientInvitationEmail = async (
  command: { clientId: string; email: string },
  principal: AuthenticatedPrincipal,
  dependencies: ClientInvitationDependencies,
): Promise<ClientInvitationView> => {
  const actor = requireAssistant(principal);
  const now = dependencies.now();
  const email = normalizeEmail(command.email);

  return dependencies.unitOfWork.execute(async (transaction) => {
    const invitation = await requireInvitation(transaction, command.clientId);
    const conflict = await transaction.findAccountByEmail(email);
    if (conflict !== null && conflict.id !== invitation.accountId) {
      throw new InvitationEmailInUseError();
    }

    await transaction.changeInvitationEmail({
      accountId: invitation.accountId,
      email,
    });
    const renewed = await renewActivation(transaction, dependencies, {
      accountId: invitation.accountId,
      email,
      now,
    });
    await transaction.recordAudit(
      audit(actor, dependencies, {
        actionCode: 'client_invitation.email_corrected',
        targetAccountId: invitation.accountId,
        occurredAt: now,
        metadata: { previousEmail: invitation.email },
      }),
    );

    return toView({ ...invitation, email, ...renewed });
  });
};

export const resendClientInvitation = async (
  command: { clientId: string },
  principal: AuthenticatedPrincipal,
  dependencies: ClientInvitationDependencies,
): Promise<ClientInvitationView> => {
  const actor = requireAssistant(principal);
  const now = dependencies.now();

  return dependencies.unitOfWork.execute(async (transaction) => {
    const invitation = await requireInvitation(transaction, command.clientId);
    const renewed = await renewActivation(transaction, dependencies, {
      accountId: invitation.accountId,
      email: invitation.email,
      now,
    });
    await transaction.recordAudit(
      audit(actor, dependencies, {
        actionCode: 'client_invitation.resent',
        targetAccountId: invitation.accountId,
        occurredAt: now,
      }),
    );

    return toView({ ...invitation, ...renewed });
  });
};

export const cancelClientInvitation = async (
  command: { clientId: string },
  principal: AuthenticatedPrincipal,
  dependencies: ClientInvitationDependencies,
): Promise<void> => {
  const actor = requireAssistant(principal);
  const now = dependencies.now();

  return dependencies.unitOfWork.execute(async (transaction) => {
    const invitation = await requireInvitation(transaction, command.clientId);
    if (invitation.hasActivity) throw new InvitationHasActivityError();

    await transaction.deleteInvitation({
      accountId: invitation.accountId,
      clientId: invitation.clientId,
    });
    await transaction.recordAudit(
      audit(actor, dependencies, {
        actionCode: 'client_invitation.cancelled',
        targetAccountId: invitation.accountId,
        occurredAt: now,
        metadata: { email: invitation.email },
      }),
    );
  });
};
