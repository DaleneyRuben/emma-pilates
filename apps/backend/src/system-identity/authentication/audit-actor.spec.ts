import { auditActorOf } from './audit-actor';
import type { AuthenticatedPrincipal } from './resolve-authenticated-principal';

describe('auditActorOf (FUT-001)', () => {
  const trainer: AuthenticatedPrincipal = {
    accountId: 'trainer-account-id',
    authenticationSessionId: 'session-id',
    identity: {
      kind: 'staff',
      staffMemberId: 'trainer-staff-member-id',
      role: 'trainer',
      branchIds: [],
    },
  };

  it('names the Staff Member who acts on their own', () => {
    expect(auditActorOf(trainer)).toEqual({
      accountId: 'trainer-account-id',
      role: 'TRAINER',
      impersonationId: null,
    });
  });

  it('names a Client with no Role', () => {
    expect(
      auditActorOf({
        accountId: 'client-account-id',
        authenticationSessionId: 'session-id',
        identity: { kind: 'client', clientId: 'client-id' },
      }),
    ).toEqual({
      accountId: 'client-account-id',
      role: null,
      impersonationId: null,
    });
  });

  it('names the Administrator behind an Impersonation and links the record to it', () => {
    expect(
      auditActorOf({
        ...trainer,
        impersonation: {
          id: 'impersonation-id',
          administratorAccountId: 'administrator-account-id',
          staffMemberName: 'Camila Rojas',
          expiresAt: new Date('2026-10-22T15:30:00.000Z'),
        },
      }),
    ).toEqual({
      accountId: 'administrator-account-id',
      role: 'ADMINISTRATOR',
      impersonationId: 'impersonation-id',
    });
  });
});
