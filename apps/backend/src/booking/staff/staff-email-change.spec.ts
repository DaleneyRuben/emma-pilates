import {
  cancelStaffEmailChange,
  requestStaffEmailChange,
  resendStaffEmailChange,
} from './staff-email-change';
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

const pending = {
  email: 'daniela.nueva@example.com',
  expiresAt: new Date(now.getTime() + day),
};

// FIX-039 (DES-012, proposal A, owner 2026-11-06): the Administrator changes
// an active Staff Member's login email; it changes only when the link sent
// to the new address is opened (IDN-008 E2).
describe('requestStaffEmailChange', () => {
  it('sends the link to the new address and audits the Administrator', async () => {
    const transaction = createTransaction({
      findStaffMember: jest
        .fn()
        .mockResolvedValueOnce(record())
        .mockResolvedValueOnce(record({ pendingEmail: pending })),
    });

    const updated = await requestStaffEmailChange(
      { staffMemberId: 'staff-1', email: ' Daniela.Nueva@Example.com ' },
      administrator,
      dependencies(transaction),
    );

    expect(transaction.emailChangeWaitSeconds).toHaveBeenCalledWith({
      email: 'daniela.nueva@example.com',
      now,
    });
    expect(transaction.requestEmailChange).toHaveBeenCalledWith({
      accountId: 'account-1',
      email: 'daniela.nueva@example.com',
      now,
    });
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'staff_member.email_change_requested',
        actorAccountId: 'admin-account',
        targetAccountId: 'account-1',
        metadata: {
          previousEmail: 'daniela@example.com',
          email: 'daniela.nueva@example.com',
        },
        occurredAt: now,
      }),
    );
    expect(updated.email).toBe('daniela@example.com');
    expect(updated.pendingEmail).toEqual(pending);
  });

  it('refuses the current address', async () => {
    const transaction = createTransaction();

    await rejectsWith(
      requestStaffEmailChange(
        { staffMemberId: 'staff-1', email: 'DANIELA@example.com' },
        administrator,
        dependencies(transaction),
      ),
      'email_unchanged',
    );
    expect(transaction.requestEmailChange).not.toHaveBeenCalled();
  });

  it('tells the studio when another Account already uses the address', async () => {
    const staff = createTransaction({
      findAccountByEmail: jest.fn().mockResolvedValue({
        id: 'other',
        kind: 'staff',
        staffMemberId: 'staff-2',
        pending: false,
      }),
    });
    const client = createTransaction({
      findAccountByEmail: jest.fn().mockResolvedValue({
        id: 'client',
        kind: 'client',
        staffMemberId: null,
        pending: false,
      }),
    });
    const command = { staffMemberId: 'staff-1', email: 'paola@example.com' };

    await rejectsWith(
      requestStaffEmailChange(command, administrator, dependencies(staff)),
      'email_in_use',
    );
    await rejectsWith(
      requestStaffEmailChange(command, administrator, dependencies(client)),
      'email_belongs_to_client',
    );
    expect(staff.requestEmailChange).not.toHaveBeenCalled();
    expect(client.requestEmailChange).not.toHaveBeenCalled();
  });

  it('says how long to wait when the new address got an email recently', async () => {
    const transaction = createTransaction({
      emailChangeWaitSeconds: jest.fn().mockResolvedValue(53),
    });

    const attempt = requestStaffEmailChange(
      { staffMemberId: 'staff-1', email: 'daniela.nueva@example.com' },
      administrator,
      dependencies(transaction),
    );

    await rejectsWith(attempt, 'email_throttled');
    await expect(attempt).rejects.toMatchObject({ retryAfterSeconds: 53 });
    expect(transaction.requestEmailChange).not.toHaveBeenCalled();
  });

  it('leaves a pending invitation to «Cambiar correo»', async () => {
    const transaction = createTransaction({
      findStaffMember: jest
        .fn()
        .mockResolvedValue(record({ status: 'pending' })),
    });

    await rejectsWith(
      requestStaffEmailChange(
        { staffMemberId: 'staff-1', email: 'daniela.nueva@example.com' },
        administrator,
        dependencies(transaction),
      ),
      'staff_member_not_active',
    );
  });

  it('is the Administrator’s alone, and never for her own account', async () => {
    const command = {
      staffMemberId: 'staff-1',
      email: 'daniela.nueva@example.com',
    };

    await rejectsWith(
      requestStaffEmailChange(
        command,
        principal('coordinator'),
        dependencies(createTransaction()),
      ),
      'staff_access_denied',
    );
    await rejectsWith(
      requestStaffEmailChange(
        { ...command, staffMemberId: 'admin-staff' },
        administrator,
        dependencies(
          createTransaction({
            findStaffMember: jest
              .fn()
              .mockResolvedValue(record({ id: 'admin-staff' })),
          }),
        ),
      ),
      'own_staff_member',
    );
  });
});

describe('resendStaffEmailChange', () => {
  it('sends a fresh link to the pending address, unaudited', async () => {
    const transaction = createTransaction({
      findStaffMember: jest
        .fn()
        .mockResolvedValue(record({ pendingEmail: pending })),
    });

    await resendStaffEmailChange(
      { staffMemberId: 'staff-1' },
      administrator,
      dependencies(transaction),
    );

    expect(transaction.emailChangeWaitSeconds).toHaveBeenCalledWith({
      email: 'daniela.nueva@example.com',
      now,
    });
    expect(transaction.resendEmailChange).toHaveBeenCalledWith({
      accountId: 'account-1',
      now,
    });
    expect(transaction.recordAudit).not.toHaveBeenCalled();
  });

  it('refuses when nothing is pending, and waits like the request', async () => {
    await rejectsWith(
      resendStaffEmailChange(
        { staffMemberId: 'staff-1' },
        administrator,
        dependencies(createTransaction()),
      ),
      'email_change_not_pending',
    );
    await rejectsWith(
      resendStaffEmailChange(
        { staffMemberId: 'staff-1' },
        administrator,
        dependencies(
          createTransaction({
            findStaffMember: jest
              .fn()
              .mockResolvedValue(record({ pendingEmail: pending })),
            emailChangeWaitSeconds: jest.fn().mockResolvedValue(40),
          }),
        ),
      ),
      'email_throttled',
    );
  });
});

describe('cancelStaffEmailChange', () => {
  it('drops the pending change and audits it', async () => {
    const transaction = createTransaction({
      findStaffMember: jest
        .fn()
        .mockResolvedValueOnce(record({ pendingEmail: pending }))
        .mockResolvedValueOnce(record()),
    });

    const updated = await cancelStaffEmailChange(
      { staffMemberId: 'staff-1' },
      administrator,
      dependencies(transaction),
    );

    expect(transaction.cancelEmailChange).toHaveBeenCalledWith({
      accountId: 'account-1',
      now,
    });
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'staff_member.email_change_cancelled',
        actorAccountId: 'admin-account',
        metadata: { email: 'daniela.nueva@example.com' },
      }),
    );
    expect(updated.pendingEmail).toBeNull();
  });

  it('refuses when nothing is pending', async () => {
    await rejectsWith(
      cancelStaffEmailChange(
        { staffMemberId: 'staff-1' },
        administrator,
        dependencies(createTransaction()),
      ),
      'email_change_not_pending',
    );
  });
});
