import {
  createStaffMember,
  resendStaffActivation,
  StaffManagementError,
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
import {
  cancelStaffInvitation,
  correctStaffInvitationEmail,
} from './staff-invitations';

beforeEach(resetIds);

const pending = record({
  status: 'pending',
  email: 'lucia.vacca@example.com',
  activationExpiresAt: new Date(now.getTime() + 3 * day),
});

describe('correctStaffInvitationEmail (WEB-012 W1, W2)', () => {
  it('moves a pending invitation to the new address with a fresh link', async () => {
    const transaction = createTransaction({
      findStaffMember: jest.fn().mockResolvedValue(pending),
    });

    await correctStaffInvitationEmail(
      { staffMemberId: 'staff-1', email: ' Lucia.Vaca@Example.com ' },
      administrator,
      dependencies(transaction),
    );

    expect(transaction.setAccountEmail).toHaveBeenCalledWith({
      accountId: 'account-1',
      email: 'lucia.vaca@example.com',
    });
    expect(transaction.reissueActivation).toHaveBeenCalledWith({
      accountId: 'account-1',
      email: 'lucia.vaca@example.com',
      pendingExpiresAt: new Date(now.getTime() + 30 * day),
      activationExpiresAt: new Date(now.getTime() + 7 * day),
    });
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'staff_member.email_corrected',
        metadata: { previousEmail: 'lucia.vacca@example.com' },
      }),
    );
  });

  it.each([
    ['an activated member', { member: record() }, 'staff_member_not_pending'],
    [
      'the same address',
      { email: 'lucia.vacca@example.com' },
      'email_unchanged',
    ],
    [
      'an address of another Staff Member',
      {
        account: {
          id: 'x',
          kind: 'staff',
          staffMemberId: 'staff-9',
          pending: false,
        },
      },
      'email_in_use',
    ],
    [
      'an address of a Client',
      {
        account: {
          id: 'x',
          kind: 'client',
          staffMemberId: null,
          pending: true,
        },
      },
      'email_belongs_to_client',
    ],
    ['a full recipient lane', { wait: 40 }, 'email_throttled'],
  ])('refuses %s without changes', async (_label, setup, code) => {
    const transaction = createTransaction({
      findStaffMember: jest
        .fn()
        .mockResolvedValue('member' in setup ? setup.member : pending),
      findAccountByEmail: jest
        .fn()
        .mockResolvedValue('account' in setup ? setup.account : null),
      activationEmailWaitSeconds: jest
        .fn()
        .mockResolvedValue('wait' in setup ? setup.wait : 0),
    });

    await rejectsWith(
      correctStaffInvitationEmail(
        {
          staffMemberId: 'staff-1',
          email: 'email' in setup ? setup.email : 'lucia.vaca@example.com',
        },
        administrator,
        dependencies(transaction),
      ),
      code,
    );
    expect(transaction.setAccountEmail).not.toHaveBeenCalled();
    expect(transaction.reissueActivation).not.toHaveBeenCalled();
  });
});

describe('cancelStaffInvitation (WEB-012 W3)', () => {
  it('removes a pending Staff Member and its Account, never deleting rows', async () => {
    const transaction = createTransaction({
      findStaffMember: jest.fn().mockResolvedValue(pending),
    });

    await cancelStaffInvitation(
      { staffMemberId: 'staff-1' },
      administrator,
      dependencies(transaction),
    );

    expect(transaction.removePendingStaffMember).toHaveBeenCalledWith({
      accountId: 'account-1',
      staffMemberId: 'staff-1',
      now,
    });
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'staff_member.invitation_cancelled',
        metadata: { email: 'lucia.vacca@example.com' },
      }),
    );
  });

  it('leaves activated members to deactivation', async () => {
    const transaction = createTransaction();

    await rejectsWith(
      cancelStaffInvitation(
        { staffMemberId: 'staff-1' },
        administrator,
        dependencies(transaction),
      ),
      'staff_member_not_pending',
    );
    expect(transaction.removePendingStaffMember).not.toHaveBeenCalled();
  });

  it('is limited to Administrators', async () => {
    await rejectsWith(
      cancelStaffInvitation(
        { staffMemberId: 'staff-1' },
        principal('assistant'),
        dependencies(createTransaction()),
      ),
      'staff_access_denied',
    );
  });
});

describe("createStaffMember with a pending invitation's email (W4)", () => {
  it('reopens it without touching its Role or Branches', async () => {
    const transaction = createTransaction({
      findAccountByEmail: jest.fn().mockResolvedValue({
        id: 'account-1',
        kind: 'staff',
        staffMemberId: 'staff-1',
        pending: true,
      }),
      findStaffMember: jest.fn().mockResolvedValue(pending),
    });

    await expect(
      createStaffMember(
        {
          name: 'Otra',
          email: 'Lucia.Vacca@example.com',
          phone: null,
          role: 'assistant',
          branchIds: ['urubo'],
        },
        administrator,
        dependencies(transaction),
      ),
    ).resolves.toMatchObject({ id: 'staff-1', invitationReopened: true });
    expect(transaction.createPendingStaffMember).not.toHaveBeenCalled();
    expect(transaction.setRole).not.toHaveBeenCalled();
    expect(transaction.replaceBranches).not.toHaveBeenCalled();
    expect(transaction.reissueActivation).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'account-1' }),
    );
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'staff_member.invitation_reopened',
      }),
    );
  });
});

describe('the recipient wait on limited emails (W6)', () => {
  it('carries the server wait on a limited resend', async () => {
    const transaction = createTransaction({
      findStaffMember: jest.fn().mockResolvedValue(pending),
      activationEmailWaitSeconds: jest.fn().mockResolvedValue(40),
    });

    await expect(
      resendStaffActivation(
        { staffMemberId: 'staff-1' },
        administrator,
        dependencies(transaction),
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        constructor: StaffManagementError,
        code: 'email_throttled',
        retryAfterSeconds: 40,
      }),
    );
  });
});
