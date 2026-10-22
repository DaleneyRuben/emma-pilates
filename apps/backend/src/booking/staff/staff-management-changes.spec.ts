import {
  changeStaffBranches,
  changeStaffRole,
  deactivateStaffMember,
} from './staff-management';
import {
  administrator,
  createTransaction,
  dependencies,
  now,
  principal,
  record,
  rejectsWith,
  resetIds,
} from './staff-management-test-support';

beforeEach(resetIds);

describe('changeStaffRole', () => {
  it('ends a Nutritionist’s availability when the Role changes', async () => {
    const transaction = createTransaction({
      findStaffMember: jest
        .fn()
        .mockResolvedValue(record({ role: 'nutritionist' })),
    });

    await changeStaffRole(
      { staffMemberId: 'staff-1', role: 'assistant' },
      administrator,
      dependencies(transaction),
    );

    expect(transaction.endNutritionistAvailability).toHaveBeenCalledWith({
      staffMemberId: 'staff-1',
      actorAccountId: 'admin-account',
      now,
    });
    expect(transaction.setRole).toHaveBeenCalledWith({
      staffMemberId: 'staff-1',
      role: 'assistant',
    });
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'staff_member.role_changed',
        metadata: { previousRole: 'nutritionist', role: 'assistant' },
      }),
    );
  });

  it('clears Branch rows when promoting to Administrator and requires Branches when demoting one', async () => {
    const transaction = createTransaction({
      findStaffMember: jest
        .fn()
        .mockResolvedValue(record({ role: 'assistant' })),
    });
    await changeStaffRole(
      { staffMemberId: 'staff-1', role: 'administrator' },
      administrator,
      dependencies(transaction),
    );
    expect(transaction.replaceBranches).toHaveBeenCalledWith({
      staffMemberId: 'staff-1',
      branchIds: [],
    });

    const demoting = createTransaction({
      findStaffMember: jest
        .fn()
        .mockResolvedValue(record({ role: 'administrator', branchIds: [] })),
    });
    await rejectsWith(
      changeStaffRole(
        { staffMemberId: 'staff-1', role: 'trainer' },
        administrator,
        dependencies(demoting),
      ),
      'invalid_branch_assignment',
    );
    await changeStaffRole(
      { staffMemberId: 'staff-1', role: 'trainer', branchIds: ['centro'] },
      administrator,
      dependencies(demoting),
    );
    expect(demoting.replaceBranches).toHaveBeenCalledWith({
      staffMemberId: 'staff-1',
      branchIds: ['centro'],
    });
  });

  it.each([
    [
      'a Trainer with upcoming Sessions',
      { trainerCommitments: 2 },
      'trainer_has_upcoming_sessions',
    ],
    [
      'the last active Administrator',
      { role: 'administrator' as const, admins: 1 },
      'last_administrator',
    ],
    ['their own Role', { self: true }, 'own_staff_member'],
    [
      'a deactivated Staff Member',
      { status: 'deactivated' as const },
      'staff_member_deactivated',
    ],
  ])('refuses to change %s', async (_label, setup, code) => {
    const transaction = createTransaction({
      findStaffMember: jest.fn().mockResolvedValue(
        record({
          role: 'role' in setup ? setup.role : 'trainer',
          status: 'status' in setup ? setup.status : 'active',
          branchIds: 'role' in setup ? [] : ['centro'],
        }),
      ),
      countTrainerCommitments: jest
        .fn()
        .mockResolvedValue(
          'trainerCommitments' in setup ? setup.trainerCommitments : 0,
        ),
      countActiveAdministrators: jest
        .fn()
        .mockResolvedValue('admins' in setup ? setup.admins : 2),
    });

    await rejectsWith(
      changeStaffRole(
        { staffMemberId: 'staff-1', role: 'assistant', branchIds: ['centro'] },
        'self' in setup ? principal('administrator', 'staff-1') : administrator,
        dependencies(transaction),
      ),
      code,
    );
    expect(transaction.setRole).not.toHaveBeenCalled();
    expect(transaction.endNutritionistAvailability).not.toHaveBeenCalled();
  });
});

describe('changeStaffBranches', () => {
  it('ends a Nutritionist’s blocks only at removed Branches', async () => {
    const transaction = createTransaction({
      findStaffMember: jest
        .fn()
        .mockResolvedValue(
          record({ role: 'nutritionist', branchIds: ['centro', 'urubo'] }),
        ),
    });

    await changeStaffBranches(
      { staffMemberId: 'staff-1', branchIds: ['centro', 'equipetrol'] },
      administrator,
      dependencies(transaction),
    );

    expect(transaction.endNutritionistAvailability).toHaveBeenCalledTimes(1);
    expect(transaction.endNutritionistAvailability).toHaveBeenCalledWith({
      staffMemberId: 'staff-1',
      branchId: 'urubo',
      actorAccountId: 'admin-account',
      now,
    });
    expect(transaction.replaceBranches).toHaveBeenCalledWith({
      staffMemberId: 'staff-1',
      branchIds: ['centro', 'equipetrol'],
    });
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'staff_member.branches_changed',
        metadata: { added: ['equipetrol'], removed: ['urubo'] },
      }),
    );
  });

  it('refuses to remove a Branch where the Trainer still leads upcoming Sessions', async () => {
    const transaction = createTransaction({
      countTrainerCommitments: jest.fn().mockResolvedValue(1),
    });

    await rejectsWith(
      changeStaffBranches(
        { staffMemberId: 'staff-1', branchIds: ['centro'] },
        administrator,
        dependencies(transaction),
      ),
      'trainer_has_upcoming_sessions',
    );
    expect(transaction.countTrainerCommitments).toHaveBeenCalledWith({
      staffMemberId: 'staff-1',
      branchIds: ['urubo'],
      now,
    });
    expect(transaction.replaceBranches).not.toHaveBeenCalled();
  });

  it('refuses Branch changes for an Administrator', async () => {
    const transaction = createTransaction({
      findStaffMember: jest
        .fn()
        .mockResolvedValue(record({ role: 'administrator', branchIds: [] })),
    });

    await rejectsWith(
      changeStaffBranches(
        { staffMemberId: 'staff-1', branchIds: ['centro'] },
        administrator,
        dependencies(transaction),
      ),
      'invalid_branch_assignment',
    );
  });
});

describe('deactivateStaffMember', () => {
  it('disables the Account, ends a Nutritionist’s availability, and audits', async () => {
    const transaction = createTransaction({
      findStaffMember: jest
        .fn()
        .mockResolvedValue(record({ role: 'nutritionist' })),
    });

    await deactivateStaffMember(
      { staffMemberId: 'staff-1' },
      administrator,
      dependencies(transaction),
    );

    expect(transaction.endNutritionistAvailability).toHaveBeenCalledWith({
      staffMemberId: 'staff-1',
      actorAccountId: 'admin-account',
      now,
    });
    expect(transaction.disableAccount).toHaveBeenCalledWith({
      accountId: 'account-1',
      now,
    });
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'staff_member.deactivated',
        targetAccountId: 'account-1',
      }),
    );
  });

  it.each([
    [
      'a Trainer with upcoming Sessions',
      { trainerCommitments: 1 },
      'trainer_has_upcoming_sessions',
    ],
    [
      'the last active Administrator',
      { role: 'administrator' as const, admins: 1 },
      'last_administrator',
    ],
    ['themselves', { self: true }, 'own_staff_member'],
    [
      'an already deactivated Staff Member',
      { status: 'deactivated' as const },
      'staff_member_deactivated',
    ],
  ])('refuses to deactivate %s', async (_label, setup, code) => {
    const transaction = createTransaction({
      findStaffMember: jest.fn().mockResolvedValue(
        record({
          role: 'role' in setup ? setup.role : 'trainer',
          status: 'status' in setup ? setup.status : 'active',
        }),
      ),
      countTrainerCommitments: jest
        .fn()
        .mockResolvedValue(
          'trainerCommitments' in setup ? setup.trainerCommitments : 0,
        ),
      countActiveAdministrators: jest
        .fn()
        .mockResolvedValue('admins' in setup ? setup.admins : 2),
    });

    await rejectsWith(
      deactivateStaffMember(
        { staffMemberId: 'staff-1' },
        'self' in setup ? principal('administrator', 'staff-1') : administrator,
        dependencies(transaction),
      ),
      code,
    );
    expect(transaction.disableAccount).not.toHaveBeenCalled();
  });
});
