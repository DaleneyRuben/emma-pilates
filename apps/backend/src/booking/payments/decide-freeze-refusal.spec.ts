import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { decideFreeze } from './decide-freeze';

const administrator: AuthenticatedPrincipal = {
  accountId: 'administrator-account',
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff',
    staffMemberId: 'administrator-id',
    role: 'administrator',
    branchIds: [],
  },
};

const freeze = {
  id: 'freeze-1',
  clientAccountId: 'client-account',
  subscriptionId: 'subscription-1',
  state: 'requested' as const,
  startsOn: new Date('2026-11-21T00:00:00.000Z'),
  endsOn: new Date('2026-11-24T00:00:00.000Z'),
  planEndsOn: new Date('2027-02-08T00:00:00.000Z'),
};

const decidedAt = new Date('2026-11-19T15:00:00.000Z');

// W16 B/C (owner 2026-11-19): «Motivo si rechazas (opcional)» is stored on
// the Freeze and sent to the Client with the refusal.
describe('decideFreeze with a refusal reason', () => {
  const refuseWith = async (refusalReason?: string) => {
    const refuse = jest.fn().mockResolvedValue(undefined);
    const record = jest.fn().mockResolvedValue(undefined);
    await expect(
      decideFreeze(
        {
          freezeId: freeze.id,
          decision: 'refused',
          ...(refusalReason === undefined ? {} : { refusalReason }),
        },
        {
          principal: administrator,
          loadFreeze: jest.fn().mockResolvedValue(freeze),
          approve: jest.fn(),
          refuse,
          record,
          now: () => decidedAt,
        },
      ),
    ).resolves.toEqual({ state: 'refused' });
    return { refuse, record };
  };

  it('stores the reason and tells it to the Client', async () => {
    const { refuse, record } = await refuseWith(
      'Esas fechas el estudio está cerrado',
    );
    expect(refuse).toHaveBeenCalledWith({
      freezeId: freeze.id,
      decidedByAccountId: 'administrator-account',
      decidedAt,
      refusalReason: 'Esas fechas el estudio está cerrado',
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'freeze_refused',
        title: 'Congelamiento rechazado',
        message:
          'Tu solicitud de congelamiento fue rechazada. Motivo: Esas fechas el estudio está cerrado',
      }),
    );
  });

  it('keeps the plain refusal when no reason is given', async () => {
    const { refuse, record } = await refuseWith();
    expect(refuse).toHaveBeenCalledWith(
      expect.objectContaining({ refusalReason: null }),
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Tu solicitud de congelamiento fue rechazada.',
      }),
    );
  });
});
