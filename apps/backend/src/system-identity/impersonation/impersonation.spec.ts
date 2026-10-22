import type { AuthenticatedPrincipal } from '../authentication/resolve-authenticated-principal';
import {
  endImpersonation,
  ImpersonationError,
  impersonationLifetimeMilliseconds,
  startImpersonation,
} from './impersonation';

describe('impersonation (FUT-001, ADR-0100)', () => {
  const now = new Date('2026-10-22T15:00:00.000Z');
  const administrator: AuthenticatedPrincipal = {
    accountId: 'administrator-account-id',
    authenticationSessionId: 'authentication-session-id',
    identity: {
      kind: 'staff',
      staffMemberId: 'administrator-staff-member-id',
      role: 'administrator',
      branchIds: [],
    },
  };
  const trainer = {
    id: 'trainer-staff-member-id',
    accountId: 'trainer-account-id',
    name: 'Camila Rojas',
    role: 'trainer' as const,
    status: 'active' as const,
  };
  const gateway = (overrides: Record<string, unknown> = {}) => ({
    findStaffMember: jest.fn().mockResolvedValue(trainer),
    start: jest.fn().mockResolvedValue(undefined),
    end: jest.fn().mockResolvedValue(true),
    ...overrides,
  });

  describe('startImpersonation', () => {
    it('records a 30-minute Impersonation of an active Trainer on the mobile session', async () => {
      const deps = gateway();

      await expect(
        startImpersonation(
          { staffMemberId: trainer.id, surface: 'mobile' },
          administrator,
          { gateway: deps, now: () => now, newId: () => 'impersonation-id' },
        ),
      ).resolves.toEqual({
        id: 'impersonation-id',
        staffMemberId: trainer.id,
        staffMemberName: 'Camila Rojas',
        role: 'trainer',
        expiresAt: new Date('2026-10-22T15:30:00.000Z'),
      });
      expect(impersonationLifetimeMilliseconds).toBe(30 * 60 * 1_000);
      expect(deps.start).toHaveBeenCalledWith({
        id: 'impersonation-id',
        authenticationSessionId: 'authentication-session-id',
        administratorAccountId: 'administrator-account-id',
        staffMember: trainer,
        startedAt: now,
        expiresAt: new Date('2026-10-22T15:30:00.000Z'),
      });
    });

    it.each([
      [
        'a Trainer',
        {
          ...administrator,
          identity: { ...administrator.identity, role: 'trainer' },
        },
      ],
      [
        'a Client',
        {
          accountId: 'client-account',
          authenticationSessionId: 's',
          identity: { kind: 'client', clientId: 'c' },
        },
      ],
    ])('refuses %s with staff_access_denied', async (_label, principal) => {
      const deps = gateway();

      await expect(
        startImpersonation(
          { staffMemberId: trainer.id, surface: 'mobile' },
          principal as AuthenticatedPrincipal,
          { gateway: deps, now: () => now, newId: () => 'id' },
        ),
      ).rejects.toMatchObject({ code: 'staff_access_denied' });
      expect(deps.start).not.toHaveBeenCalled();
    });

    it('refuses the admin web with impersonation_surface', async () => {
      await expect(
        startImpersonation(
          { staffMemberId: trainer.id, surface: 'admin_web' },
          administrator,
          { gateway: gateway(), now: () => now, newId: () => 'id' },
        ),
      ).rejects.toMatchObject({ code: 'impersonation_surface' });
    });

    it('refuses a second Impersonation on the same session', async () => {
      await expect(
        startImpersonation(
          { staffMemberId: trainer.id, surface: 'mobile' },
          {
            ...administrator,
            impersonation: {
              id: 'other',
              administratorAccountId: 'administrator-account-id',
            },
          },
          { gateway: gateway(), now: () => now, newId: () => 'id' },
        ),
      ).rejects.toMatchObject({ code: 'impersonation_active' });
    });

    it('answers staff_member_not_found for an unknown id', async () => {
      await expect(
        startImpersonation(
          { staffMemberId: 'missing', surface: 'mobile' },
          administrator,
          {
            gateway: gateway({
              findStaffMember: jest.fn().mockResolvedValue(null),
            }),
            now: () => now,
            newId: () => 'id',
          },
        ),
      ).rejects.toMatchObject({ code: 'staff_member_not_found' });
    });

    it.each([
      ['another Administrator', { ...trainer, role: 'administrator' as const }],
      ['a pending Staff Member', { ...trainer, status: 'pending' as const }],
      [
        'a deactivated Staff Member',
        { ...trainer, status: 'deactivated' as const },
      ],
    ])(
      'refuses %s with staff_member_not_impersonable',
      async (_label, member) => {
        await expect(
          startImpersonation(
            { staffMemberId: member.id, surface: 'mobile' },
            administrator,
            {
              gateway: gateway({
                findStaffMember: jest.fn().mockResolvedValue(member),
              }),
              now: () => now,
              newId: () => 'id',
            },
          ),
        ).rejects.toMatchObject({ code: 'staff_member_not_impersonable' });
      },
    );

    it('turns the gateway’s active conflict into impersonation_active', async () => {
      const deps = gateway({
        start: jest
          .fn()
          .mockRejectedValue(new ImpersonationError('impersonation_active')),
      });

      await expect(
        startImpersonation(
          { staffMemberId: trainer.id, surface: 'mobile' },
          administrator,
          { gateway: deps, now: () => now, newId: () => 'id' },
        ),
      ).rejects.toMatchObject({ code: 'impersonation_active' });
    });
  });

  describe('endImpersonation', () => {
    it('ends the current Impersonation as exited by the Administrator', async () => {
      const deps = gateway();

      await endImpersonation(
        {
          ...administrator,
          accountId: 'trainer-account-id',
          impersonation: {
            id: 'impersonation-id',
            administratorAccountId: 'administrator-account-id',
          },
        },
        { gateway: deps, now: () => now },
      );

      expect(deps.end).toHaveBeenCalledWith({
        impersonationId: 'impersonation-id',
        endedAt: now,
        reason: 'exited',
        actorAccountId: 'administrator-account-id',
      });
    });

    it('answers impersonation_not_active when the session is not impersonating', async () => {
      await expect(
        endImpersonation(administrator, { gateway: gateway(), now: () => now }),
      ).rejects.toMatchObject({ code: 'impersonation_not_active' });
    });

    it('answers impersonation_not_active when the row already ended', async () => {
      await expect(
        endImpersonation(
          {
            ...administrator,
            impersonation: {
              id: 'impersonation-id',
              administratorAccountId: 'administrator-account-id',
            },
          },
          {
            gateway: gateway({ end: jest.fn().mockResolvedValue(false) }),
            now: () => now,
          },
        ),
      ).rejects.toMatchObject({ code: 'impersonation_not_active' });
    });
  });
});
