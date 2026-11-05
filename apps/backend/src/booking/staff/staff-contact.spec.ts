import { changeStaffContact } from './staff-contact';
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

// FIX-038, decision §20.22: the Administrator corrects another Staff
// Member's name and phone, active or pending.
describe('changeStaffContact', () => {
  it('saves a new name and a normalized phone and audits old and new values', async () => {
    const transaction = createTransaction({
      findStaffMember: jest
        .fn()
        .mockResolvedValueOnce(record({ name: 'Camila Rojaz', phone: null }))
        .mockResolvedValueOnce(
          record({ name: 'Camila Rojas', phone: '+591 70000001' }),
        ),
    });

    const updated = await changeStaffContact(
      { staffMemberId: 'staff-1', name: ' Camila Rojas ', phone: '70000001' },
      administrator,
      dependencies(transaction),
    );

    expect(transaction.setName).toHaveBeenCalledWith({
      staffMemberId: 'staff-1',
      name: 'Camila Rojas',
    });
    expect(transaction.setPhone).toHaveBeenCalledWith({
      staffMemberId: 'staff-1',
      phone: '+591 70000001',
    });
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionCode: 'staff_member.contact_changed',
        actorAccountId: 'admin-account',
        targetAccountId: 'account-1',
        metadata: {
          previousName: 'Camila Rojaz',
          name: 'Camila Rojas',
          previousPhone: '',
          phone: '+591 70000001',
        },
        occurredAt: now,
      }),
    );
    expect(updated.phone).toBe('+591 70000001');
  });

  it('writes and audits only what changed', async () => {
    const transaction = createTransaction({
      findStaffMember: jest
        .fn()
        .mockResolvedValue(record({ phone: '+591 70000002' })),
    });

    await changeStaffContact(
      { staffMemberId: 'staff-1', name: 'Daniela Ortiz', phone: null },
      administrator,
      dependencies(transaction),
    );

    expect(transaction.setName).not.toHaveBeenCalled();
    expect(transaction.setPhone).toHaveBeenCalledWith({
      staffMemberId: 'staff-1',
      phone: null,
    });
    expect(transaction.recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { previousPhone: '+591 70000002', phone: '' },
      }),
    );
  });

  it('changes nothing and audits nothing when the contact is the same', async () => {
    const transaction = createTransaction({
      findStaffMember: jest
        .fn()
        .mockResolvedValue(record({ phone: '+591 70000002' })),
    });

    await changeStaffContact(
      {
        staffMemberId: 'staff-1',
        name: 'Daniela Ortiz',
        phone: '+591 7000 0002',
      },
      administrator,
      dependencies(transaction),
    );

    expect(transaction.setName).not.toHaveBeenCalled();
    expect(transaction.setPhone).not.toHaveBeenCalled();
    expect(transaction.recordAudit).not.toHaveBeenCalled();
  });

  it('keeps a phone that is not a Bolivian mobile as typed', async () => {
    const transaction = createTransaction();

    await changeStaffContact(
      {
        staffMemberId: 'staff-1',
        name: 'Daniela Ortiz',
        phone: ' +54 9 11 5555 0000 ',
      },
      administrator,
      dependencies(transaction),
    );

    expect(transaction.setPhone).toHaveBeenCalledWith({
      staffMemberId: 'staff-1',
      phone: '+54 9 11 5555 0000',
    });
  });

  it('corrects a pending invitation too', async () => {
    const transaction = createTransaction({
      findStaffMember: jest
        .fn()
        .mockResolvedValue(record({ status: 'pending', name: 'Paula' })),
    });

    await changeStaffContact(
      { staffMemberId: 'staff-1', name: 'Paula Méndez', phone: null },
      administrator,
      dependencies(transaction),
    );

    expect(transaction.setName).toHaveBeenCalledWith({
      staffMemberId: 'staff-1',
      name: 'Paula Méndez',
    });
  });

  it.each(['coordinator', 'assistant', 'trainer'] as const)(
    'refuses a %s',
    async (role) => {
      const transaction = createTransaction();

      await rejectsWith(
        changeStaffContact(
          { staffMemberId: 'staff-1', name: 'Otra', phone: null },
          principal(role),
          dependencies(transaction),
        ),
        'staff_access_denied',
      );
      expect(transaction.setName).not.toHaveBeenCalled();
    },
  );

  it('refuses the Administrator’s own Staff Member and a deactivated one', async () => {
    await rejectsWith(
      changeStaffContact(
        { staffMemberId: 'admin-staff', name: 'Ana', phone: null },
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
    await rejectsWith(
      changeStaffContact(
        { staffMemberId: 'staff-1', name: 'Ana', phone: null },
        administrator,
        dependencies(
          createTransaction({
            findStaffMember: jest
              .fn()
              .mockResolvedValue(record({ status: 'deactivated' })),
          }),
        ),
      ),
      'staff_member_deactivated',
    );
  });
});
