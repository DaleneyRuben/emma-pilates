import {
  changeStaffBranches,
  changeStaffRole,
  createStaffMember,
  deactivateStaffMember,
  listStaffMembers,
  readStaffMember,
  resendStaffActivation,
} from './staff-management';
import {
  administrator,
  createTransaction,
  day,
  dependencies,
  now,
  principal,
  record,
  rejectsWith,
  resetIds,
} from './staff-management-test-support';

beforeEach(resetIds);

describe('createStaffMember', () => {
  const command = {
    name: '  Andrea Suárez ',
    email: ' Andrea@Example.com ',
    phone: '+591 70000001',
    role: 'trainer' as const,
    branchIds: ['centro'],
  };

  it('creates a pending Staff Member with its Branches, activation link, and audit', async () => {
    const transaction = createTransaction({
      findStaffMember: jest.fn().mockResolvedValue(
        record({
          id: 'id-2',
          accountId: 'id-1',
          name: 'Andrea Suárez',
          email: 'andrea@example.com',
          status: 'pending',
          branchIds: ['centro'],
        }),
      ),
    });

    const created = await createStaffMember(
      command,
      administrator,
      dependencies(transaction),
    );

    expect(transaction.createPendingStaffMember).toHaveBeenCalledWith({
      accountId: 'id-1',
      staffMemberId: 'id-2',
      name: 'Andrea Suárez',
      email: 'andrea@example.com',
      phone: '+591 70000001',
      role: 'trainer',
      branchIds: ['centro'],
      pendingExpiresAt: new Date(now.getTime() + 30 * day),
      activationExpiresAt: new Date(now.getTime() + 7 * day),
    });
    expect(transaction.recordAudit).toHaveBeenCalledWith({
      actionCode: 'staff_member.created',
      actorAccountId: 'admin-account',
      targetAccountId: 'id-1',
      correlationId: 'id-3',
      metadata: { role: 'trainer', branchIds: ['centro'] },
      occurredAt: now,
    });
    expect(created).toMatchObject({ id: 'id-2', status: 'pending' });
  });

  it('creates an Administrator without Branch rows', async () => {
    const transaction = createTransaction();

    await createStaffMember(
      { ...command, role: 'administrator', branchIds: ['centro'] },
      administrator,
      dependencies(transaction),
    );

    expect(transaction.createPendingStaffMember).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'administrator', branchIds: [] }),
    );
  });

  it.each([
    [
      'a non-Administrator',
      { principal: principal('assistant') },
      'staff_access_denied',
    ],
    [
      'an email of another Staff Member',
      {
        account: {
          id: 'other',
          kind: 'staff',
          staffMemberId: 'staff-9',
          pending: false,
        },
      },
      'email_in_use',
    ],
    [
      'an email of a Client Account',
      {
        account: {
          id: 'other',
          kind: 'client',
          staffMemberId: null,
          pending: false,
        },
      },
      'email_belongs_to_client',
    ],
    ['no Branch for a Trainer', { branchIds: [] }, 'invalid_branch_assignment'],
    [
      'an archived or unknown Branch',
      { branchIds: ['archived'] },
      'invalid_branch_assignment',
    ],
    ['a throttled recipient', { throttled: true }, 'email_throttled'],
  ])('refuses %s without changes', async (_label, setup, code) => {
    const transaction = createTransaction({
      findAccountByEmail: jest
        .fn()
        .mockResolvedValue('account' in setup ? setup.account : null),
      activationEmailWaitSeconds: jest
        .fn()
        .mockResolvedValue('throttled' in setup ? 40 : 0),
    });

    await rejectsWith(
      createStaffMember(
        {
          ...command,
          branchIds: 'branchIds' in setup ? setup.branchIds : ['centro'],
        },
        'principal' in setup ? setup.principal : administrator,
        dependencies(transaction),
      ),
      code,
    );
    expect(transaction.createPendingStaffMember).not.toHaveBeenCalled();
    expect(transaction.recordAudit).not.toHaveBeenCalled();
  });
});

describe('resendStaffActivation', () => {
  it('reissues the activation link of a pending Staff Member', async () => {
    const transaction = createTransaction({
      findStaffMember: jest
        .fn()
        .mockResolvedValue(record({ status: 'pending' })),
    });

    await resendStaffActivation(
      { staffMemberId: 'staff-1' },
      administrator,
      dependencies(transaction),
    );

    expect(transaction.reissueActivation).toHaveBeenCalledWith({
      accountId: 'account-1',
      email: 'daniela@example.com',
      pendingExpiresAt: new Date(now.getTime() + 30 * day),
      activationExpiresAt: new Date(now.getTime() + 7 * day),
    });
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({ actionCode: 'staff_member.activation_resent' }),
    );
  });

  it('refuses when the Staff Member already activated', async () => {
    await rejectsWith(
      resendStaffActivation(
        { staffMemberId: 'staff-1' },
        administrator,
        dependencies(createTransaction()),
      ),
      'staff_member_not_pending',
    );
  });
});

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

describe('staff directory reads', () => {
  const directory = {
    list: jest.fn().mockResolvedValue({
      items: [record()],
      page: 1,
      pageSize: 20,
      totalItems: 1,
    }),
    read: jest.fn().mockResolvedValue(record()),
  };

  it('lists and reads Staff Members for an Administrator', async () => {
    await expect(
      listStaffMembers({ page: 1, pageSize: 20 }, administrator, directory),
    ).resolves.toMatchObject({ totalItems: 1 });
    await expect(
      readStaffMember({ staffMemberId: 'staff-1' }, administrator, directory),
    ).resolves.toMatchObject({ id: 'staff-1' });
  });

  it('denies other Roles and reports an unknown Staff Member', async () => {
    await rejectsWith(
      listStaffMembers(
        { page: 1, pageSize: 20 },
        principal('assistant'),
        directory,
      ),
      'staff_access_denied',
    );
    directory.read.mockResolvedValueOnce(null);
    await rejectsWith(
      readStaffMember({ staffMemberId: 'missing' }, administrator, directory),
      'staff_member_not_found',
    );
  });
});
