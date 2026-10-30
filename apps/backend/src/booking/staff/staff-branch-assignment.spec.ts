import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { changeStaffBranches, type StaffRoleName } from './staff-management';
import {
  administrator,
  createTransaction,
  dependencies,
  principal,
  record,
  rejectsWith,
  resetIds,
} from './staff-management-test-support';

beforeEach(resetIds);

const coordinator: AuthenticatedPrincipal = {
  ...principal('coordinator', 'coordinator-staff'),
  accountId: 'coordinator-account',
};

const memberWithRole = (role: StaffRoleName, id = 'staff-1') =>
  createTransaction({
    findStaffMember: jest
      .fn()
      .mockResolvedValue(record({ id, role, branchIds: ['centro'] })),
  });

// Decision 6 (FIX-010): the Coordinator changes the Branches of Trainers
// only; every other Staff Member's Branches stay with the Administrator.
describe('changeStaffBranches by the Coordinator', () => {
  it('assigns a Trainer’s Branches and audits it as hers', async () => {
    const transaction = createTransaction();

    await changeStaffBranches(
      { staffMemberId: 'staff-1', branchIds: ['centro'] },
      coordinator,
      dependencies(transaction),
    );

    expect(transaction.replaceBranches).toHaveBeenCalledWith({
      staffMemberId: 'staff-1',
      branchIds: ['centro'],
    });
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'staff_member.branches_changed',
        actorAccountId: 'coordinator-account',
        actorRole: 'COORDINATOR',
        impersonationId: null,
      }),
    );
  });

  it('names the Administrator who sees the app as the Coordinator', async () => {
    const transaction = createTransaction();

    await changeStaffBranches(
      { staffMemberId: 'staff-1', branchIds: ['centro'] },
      {
        ...coordinator,
        impersonation: {
          id: 'impersonation-id',
          administratorAccountId: 'admin-account',
          staffMemberName: 'Carolina Rivas',
          expiresAt: new Date('2026-09-23T15:30:00.000Z'),
        },
      },
      dependencies(transaction),
    );

    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorAccountId: 'admin-account',
        actorRole: 'ADMINISTRATOR',
        impersonationId: 'impersonation-id',
      }),
    );
  });

  it.each(['assistant', 'nutritionist', 'administrator'] as const)(
    'refuses to change the Branches of a Staff Member with Role %s',
    async (role) => {
      const transaction = memberWithRole(role);

      await rejectsWith(
        changeStaffBranches(
          { staffMemberId: 'staff-1', branchIds: ['urubo'] },
          coordinator,
          dependencies(transaction),
        ),
        'staff_access_denied',
      );
      expect(transaction.replaceBranches).not.toHaveBeenCalled();
      expect(transaction.recordAudit).not.toHaveBeenCalled();
    },
  );

  it('refuses to change her own Branches', async () => {
    const transaction = memberWithRole('coordinator', 'coordinator-staff');

    await rejectsWith(
      changeStaffBranches(
        { staffMemberId: 'coordinator-staff', branchIds: ['urubo'] },
        coordinator,
        dependencies(transaction),
      ),
      'staff_access_denied',
    );
    expect(transaction.replaceBranches).not.toHaveBeenCalled();
  });
});

describe('changeStaffBranches by the Administrator', () => {
  it.each(['assistant', 'nutritionist', 'trainer'] as const)(
    'still changes the Branches of a Staff Member with Role %s',
    async (role) => {
      const transaction = memberWithRole(role);

      await changeStaffBranches(
        { staffMemberId: 'staff-1', branchIds: ['urubo'] },
        administrator,
        dependencies(transaction),
      );

      expect(transaction.replaceBranches).toHaveBeenCalledWith({
        staffMemberId: 'staff-1',
        branchIds: ['urubo'],
      });
      expect(transaction.recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          actorAccountId: 'admin-account',
          actorRole: 'ADMINISTRATOR',
          impersonationId: null,
        }),
      );
    },
  );
});
