import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import {
  correctClientAcquisition,
  readClientAcquisition,
  type ClientAcquisitionStore,
  type ClientAcquisitionView,
} from './client-acquisition';

const staff = (
  role: 'administrator' | 'assistant' | 'trainer' | 'nutritionist',
): AuthenticatedPrincipal => ({
  accountId: `${role}-account`,
  authenticationSessionId: 'session',
  identity: {
    kind: 'staff',
    staffMemberId: `${role}-id`,
    role,
    branchIds: [],
  },
});
const client: AuthenticatedPrincipal = {
  accountId: 'client-account',
  authenticationSessionId: 'session',
  identity: { kind: 'client', clientId: 'client-id' },
};
const now = new Date('2026-10-23T15:00:00.000Z');

const view: ClientAcquisitionView = {
  clientId: 'ana-id',
  declaredChannel: 'instagram',
  channel: 'trainer',
  referralCode: 'CARLA',
  referrer: { kind: 'trainer', id: 'carla-id', name: 'Carla' },
};

const store = (
  overrides: Partial<jest.Mocked<ClientAcquisitionStore>> = {},
): jest.Mocked<ClientAcquisitionStore> => ({
  read: jest.fn().mockResolvedValue(view),
  correct: jest.fn().mockResolvedValue(view),
  ...overrides,
});

describe('Client acquisition on the Client detail (BKM-011)', () => {
  it('shows the Administrator how the Client found the studio', async () => {
    const acquisitions = store();

    await expect(
      readClientAcquisition({ clientId: 'ana-id' }, staff('administrator'), {
        store: acquisitions,
        now: () => now,
      }),
    ).resolves.toEqual(view);
    expect(acquisitions.read).toHaveBeenCalledWith('ana-id');
  });

  it('lets the Administrator correct the channel and the code', async () => {
    const acquisitions = store();

    await correctClientAcquisition(
      { clientId: 'ana-id', channel: 'tiktok', referralCode: ' carla ' },
      staff('administrator'),
      { store: acquisitions, now: () => now },
    );

    expect(acquisitions.correct).toHaveBeenCalledWith({
      clientId: 'ana-id',
      declaredChannel: 'tiktok',
      referralCode: 'CARLA',
      actor: { accountId: 'administrator-account', role: 'administrator' },
      occurredAt: now,
    });
  });

  it('reports a Client that does not exist', async () => {
    const missing = store({
      read: jest.fn().mockResolvedValue(null),
      correct: jest.fn().mockResolvedValue(null),
    });
    const dependencies = { store: missing, now: () => now };

    await expect(
      readClientAcquisition(
        { clientId: 'gone' },
        staff('administrator'),
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'client_not_found' });
    await expect(
      correctClientAcquisition(
        { clientId: 'gone', channel: 'other', referralCode: null },
        staff('administrator'),
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'client_not_found' });
  });

  it.each([
    ['an Assistant', staff('assistant')],
    ['a Trainer', staff('trainer')],
    ['a Nutritionist', staff('nutritionist')],
    ['a Client', client],
  ])('denies %s both reading and correcting', async (_who, principal) => {
    const acquisitions = store();
    const dependencies = { store: acquisitions, now: () => now };

    await expect(
      readClientAcquisition({ clientId: 'ana-id' }, principal, dependencies),
    ).rejects.toMatchObject({ code: 'acquisition_access_denied' });
    await expect(
      correctClientAcquisition(
        { clientId: 'ana-id', channel: 'other', referralCode: null },
        principal,
        dependencies,
      ),
    ).rejects.toMatchObject({ code: 'acquisition_access_denied' });
    expect(acquisitions.read).not.toHaveBeenCalled();
    expect(acquisitions.correct).not.toHaveBeenCalled();
  });
});
