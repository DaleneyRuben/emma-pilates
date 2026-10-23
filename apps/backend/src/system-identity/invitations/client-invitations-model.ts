import type { DeclaredAcquisitionChannel } from '../../booking/acquisition/acquisition';
import type { AuthenticationEmailJob } from '../../jobs/authentication-email/authentication-email-job';
import type { EncryptedAuthenticationLink } from '../security/authentication-link-cipher';
import type { IssuedAuthenticationToken } from '../security/authentication-token-service';

// ADR-0029: an invited Account activates through a 7-day link and the
// invitation itself stays pending for 30 days after the last update or
// resend; a self-registered pending Account keeps its 24-hour verification
// link and its 7-day pending window instead (client-verification-resend.ts).
export const activationLifetimeMilliseconds = 7 * 24 * 60 * 60 * 1_000;
export const pendingInvitationLifetimeMilliseconds = 30 * 24 * 60 * 60 * 1_000;

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

// The pending Account registered herself: S06 offers the verification link.
export class ClientVerificationPendingError extends Error {
  constructor() {
    super('Client verification pending');
  }
}

export class InvitationEmailInUseError extends Error {
  constructor() {
    super('Email already belongs to another Account');
  }
}

export class InvitationEmailThrottledError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super('Too many emails were sent to this recipient');
  }
}

export class InvitationHasActivityError extends Error {
  constructor() {
    super('Client already has Payments or Bookings');
  }
}

export type StoredAuthenticationToken = {
  id: string;
  digest: Uint8Array;
  expiresAt: Date;
};

export type EmailPurpose = 'verification' | 'activation';

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
  pendingFlow: 'staff_invitation' | 'self_registration';
};

export type InvitationAudit = {
  actionCode:
    | 'client_invitation.created'
    | 'client_invitation.resent'
    | 'client_invitation.email_corrected'
    | 'client_invitation.verification_sent'
    | 'client_invitation.cancelled';
  actorAccountId: string;
  actorRole: 'assistant' | 'administrator';
  impersonationId: string | null;
  targetAccountId: string;
  correlationId: string;
  metadata: Record<string, string> | null;
  occurredAt: Date;
};

export interface ClientInvitationTransaction {
  findAccountByEmail: (email: string) => Promise<ExistingAccount | null>;
  /** The Client's pending Account, from a staff invitation or her own registration. */
  findInvitation: (clientId: string) => Promise<ClientInvitationRecord | null>;
  /** Seconds until the recipient lane has room again, 0 when it has. */
  authenticationEmailWaitSeconds: (input: {
    email: string;
    purpose: EmailPurpose;
    now: Date;
  }) => Promise<number>;
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
  removeInvitation: (input: {
    accountId: string;
    clientId: string;
    now: Date;
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

export type InviteClientCommand = {
  name: string;
  email: string;
  phone: string | null;
  /** BKM-011: absent from Staff builds older than the question. */
  acquisitionChannel?: DeclaredAcquisitionChannel;
  referralCode?: string;
};

export type InviteClientResult = {
  status: 'invited' | 'invitation_resent' | 'verification_pending';
  clientId: string;
  email: string;
};

export type Actor = {
  accountId: string;
  role: 'assistant' | 'administrator';
  /** FUT-001: the Impersonation the audit record points at, if any. */
  impersonationId: string | null;
};
