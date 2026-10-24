import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { decideFreeze } from './decide-freeze';

const staff = (
  role: 'assistant' | 'administrator' | 'trainer' | 'nutritionist',
): AuthenticatedPrincipal => ({
  accountId: `${role}-account`,
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff',
    staffMemberId: `${role}-id`,
    role,
    branchIds: role === 'administrator' ? [] : ['branch-centro'],
  },
});

const client: AuthenticatedPrincipal = {
  accountId: 'client-account',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client', clientId: 'client-id' },
};

const freeze = {
  id: 'freeze-1',
  clientAccountId: 'client-account',
  subscriptionId: 'subscription-1',
  state: 'requested' as const,
  endsOn: new Date('2026-11-10T00:00:00.000Z'),
};

describe('decideFreeze', () => {
  it('lets an Administrator approve and tells the Client', async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const approve = jest.fn().mockResolvedValue(undefined);

    await expect(
      decideFreeze(
        { freezeId: freeze.id, decision: 'approved' },
        {
          principal: staff('administrator'),
          loadFreeze: jest.fn().mockResolvedValue(freeze),
          approve,
          refuse: jest.fn(),
          record,
          now: () => new Date('2026-10-23T15:00:00.000Z'),
        },
      ),
    ).resolves.toEqual({ state: 'approved' });

    expect(approve).toHaveBeenCalledWith({
      freezeId: freeze.id,
      decidedByAccountId: 'administrator-account',
      decidedAt: new Date('2026-10-23T15:00:00.000Z'),
    });
    expect(record).toHaveBeenCalledWith({
      accountId: 'client-account',
      category: 'subscription_payment',
      type: 'freeze_approved',
      businessEventKey: 'freeze-decided:freeze-1',
      title: 'Congelamiento aprobado',
      message: 'Tu plan está congelado hasta el 2026-11-10.',
      destination: { type: 'subscription', id: 'subscription-1' },
      occurredAt: new Date('2026-10-23T15:00:00.000Z'),
    });
  });

  it('refuses an Assistant, a Trainer, a Nutritionist, a Client, and a Coordinator', async () => {
    const loadFreeze = jest.fn();
    for (const principal of [
      staff('assistant'),
      staff('trainer'),
      staff('nutritionist'),
      client,
      {
        ...staff('administrator'),
        identity: {
          ...staff('administrator').identity,
          role: 'coordinator' as 'administrator',
        },
      },
    ]) {
      await expect(
        decideFreeze(
          { freezeId: freeze.id, decision: 'approved' },
          {
            principal,
            loadFreeze,
            approve: jest.fn(),
            refuse: jest.fn(),
            record: jest.fn(),
            now: () => new Date('2026-10-23T15:00:00.000Z'),
          },
        ),
      ).rejects.toMatchObject({ code: 'freeze_access_denied' });
    }
    expect(loadFreeze).not.toHaveBeenCalled();
  });

  it('tells the Client when the Administrator refuses', async () => {
    const record = jest.fn().mockResolvedValue(undefined);

    await expect(
      decideFreeze(
        { freezeId: freeze.id, decision: 'refused' },
        {
          principal: staff('administrator'),
          loadFreeze: jest.fn().mockResolvedValue(freeze),
          approve: jest.fn(),
          refuse: jest.fn().mockResolvedValue(undefined),
          record,
          now: () => new Date('2026-10-23T15:00:00.000Z'),
        },
      ),
    ).resolves.toEqual({ state: 'refused' });

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'freeze_refused',
        title: 'Congelamiento rechazado',
        message: 'Tu solicitud de congelamiento fue rechazada.',
      }),
    );
  });
});
