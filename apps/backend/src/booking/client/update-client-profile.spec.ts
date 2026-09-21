import { BookingAccessDeniedError } from '../commands/create-booking';
import { updateClientProfile } from './update-client-profile';

const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};

describe('updateClientProfile', () => {
  it('saves the trimmed name and phone for the authenticated Client', async () => {
    const saveProfile = jest.fn().mockResolvedValue({
      id: 'client-id',
      name: 'Lucía Fernández',
      email: 'lucia@example.com',
      phone: '+591 70011001',
      referralCode: 'REF-LUCIA',
    });

    await expect(
      updateClientProfile(
        { name: '  Lucía Fernández ', phone: ' +591 70011001 ' },
        { principal, saveProfile },
      ),
    ).resolves.toMatchObject({ name: 'Lucía Fernández' });
    expect(saveProfile).toHaveBeenCalledWith('client-id', {
      name: 'Lucía Fernández',
      phone: '+591 70011001',
    });
  });

  it('clears the phone when it is blank', async () => {
    const saveProfile = jest.fn().mockResolvedValue({});

    await updateClientProfile(
      { name: 'Lucía', phone: '   ' },
      { principal, saveProfile },
    );

    expect(saveProfile).toHaveBeenCalledWith('client-id', {
      name: 'Lucía',
      phone: null,
    });
  });

  it('rejects a blank name', async () => {
    const saveProfile = jest.fn();

    await expect(
      updateClientProfile(
        { name: '   ', phone: null },
        { principal, saveProfile },
      ),
    ).rejects.toThrow('Client name is required');
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it('denies Staff principals', async () => {
    await expect(
      updateClientProfile(
        { name: 'Lucía', phone: null },
        {
          principal: {
            ...principal,
            identity: {
              kind: 'staff',
              staffMemberId: 'staff-id',
              role: 'assistant',
              branchIds: [],
            },
          },
          saveProfile: jest.fn(),
        },
      ),
    ).rejects.toBeInstanceOf(BookingAccessDeniedError);
  });
});
