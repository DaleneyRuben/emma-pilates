import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import type { ClientInvitationTransaction } from './client-invitations';

export const now = new Date('2026-09-22T15:00:00.000Z');
export const day = 24 * 60 * 60 * 1_000;
export const staff = (
  role: 'assistant' | 'administrator' | 'trainer',
): AuthenticatedPrincipal => ({
  accountId: 'assistant-account',
  authenticationSessionId: 'session',
  identity: { kind: 'staff', staffMemberId: 'staff-id', role, branchIds: [] },
});
export const assistant = staff('assistant');
export const client: AuthenticatedPrincipal = {
  accountId: 'client-account',
  authenticationSessionId: 'session',
  identity: { kind: 'client', clientId: 'client-id' },
};

export const invitation = {
  accountId: 'account-1',
  clientId: 'client-1',
  name: 'Ana Nueva',
  email: 'ana@example.com',
  phone: '+591 70000000',
  pendingExpiresAt: new Date('2026-10-10T00:00:00.000Z'),
  activationExpiresAt: new Date('2026-09-25T00:00:00.000Z'),
  hasActivity: false,
  pendingFlow: 'staff_invitation' as const,
};

export const createTransaction = (
  overrides: Partial<jest.Mocked<ClientInvitationTransaction>> = {},
): jest.Mocked<ClientInvitationTransaction> => ({
  findAccountByEmail: jest.fn().mockResolvedValue(null),
  findInvitation: jest.fn().mockResolvedValue(invitation),
  authenticationEmailWaitSeconds: jest.fn().mockResolvedValue(0),
  recordIssuedAuthenticationEmail: jest.fn().mockResolvedValue(undefined),
  createInvitation: jest.fn().mockResolvedValue(undefined),
  replaceStaffInvitationActivation: jest.fn().mockResolvedValue(undefined),
  replaceSelfRegistrationVerification: jest.fn().mockResolvedValue(undefined),
  changeInvitationEmail: jest.fn().mockResolvedValue(undefined),
  removeInvitation: jest.fn().mockResolvedValue(undefined),
  scheduleAuthenticationEmail: jest.fn().mockResolvedValue(undefined),
  recordAudit: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

let ids = 0;
export const resetIds = (): void => {
  ids = 0;
};
export const dependencies = (transaction: ClientInvitationTransaction) => ({
  unitOfWork: {
    execute: <Result>(
      work: (tx: ClientInvitationTransaction) => Promise<Result>,
    ) => work(transaction),
  },
  tokenIssuer: {
    issue: () => ({ secret: 'link-secret', digest: Buffer.from('digest') }),
  },
  linkCipher: {
    encrypt: () => ({
      encryptedLinkSecret: 'encrypted',
      encryptionKeyId: 'key-1',
    }),
  },
  now: () => now,
  newId: () => `id-${(ids += 1)}`,
  newReferralCode: () => 'REF-NEW',
});
