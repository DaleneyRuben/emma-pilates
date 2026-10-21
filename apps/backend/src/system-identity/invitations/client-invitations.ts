import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import {
  activationLifetimeMilliseconds,
  ClientInvitationNotFoundError,
  ClientVerificationPendingError,
  InvitationAccessDeniedError,
  InvitationEmailInUseError,
  InvitationEmailThrottledError,
  InvitationHasActivityError,
  pendingInvitationLifetimeMilliseconds,
  type Actor,
  type ClientInvitationDependencies,
  type ClientInvitationRecord,
  type ClientInvitationTransaction,
  type ClientInvitationView,
  type EmailPurpose,
  type InvitationAudit,
  type InviteClientResult,
  type StoredAuthenticationToken,
} from './client-invitations-model';

export * from './client-invitations-model';

export const requireAssistant = (principal: AuthenticatedPrincipal): Actor => {
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
export const issueLink = (
  dependencies: ClientInvitationDependencies,
  now: Date,
) => {
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

export const requireThrottleRoom = async (
  transaction: ClientInvitationTransaction,
  input: { email: string; purpose: EmailPurpose; now: Date },
): Promise<void> => {
  const waitSeconds = await transaction.authenticationEmailWaitSeconds(input);
  if (waitSeconds > 0) {
    throw new InvitationEmailThrottledError(waitSeconds);
  }
};

export const requirePendingAccount = async (
  transaction: ClientInvitationTransaction,
  clientId: string,
): Promise<ClientInvitationRecord> => {
  const pending = await transaction.findInvitation(clientId);
  if (pending === null) throw new ClientInvitationNotFoundError();
  return pending;
};

// A self-registered Account already has a password, so an activation link
// would never work for it.
export const requireInvitation = async (
  transaction: ClientInvitationTransaction,
  clientId: string,
): Promise<ClientInvitationRecord> => {
  const invitation = await requirePendingAccount(transaction, clientId);
  if (invitation.pendingFlow === 'self_registration') {
    throw new ClientVerificationPendingError();
  }
  return invitation;
};

export const audit = (
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

    // S05 offers the 24-hour verification link instead of sending it.
    if (existing.pendingFlow === 'self_registration') {
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

    await transaction.removeInvitation({
      accountId: invitation.accountId,
      clientId: invitation.clientId,
      now,
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
