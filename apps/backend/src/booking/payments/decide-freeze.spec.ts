import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { decideFreeze } from './decide-freeze';

const staff = (
  role:
    'assistant' | 'administrator' | 'trainer' | 'nutritionist' | 'coordinator',
): AuthenticatedPrincipal => ({
  accountId: `${role}-account`,
  authenticationSessionId: 'authentication-session-id',
  identity: {
    kind: 'staff',
    staffMemberId: `${role}-id`,
    role,
    branchIds:
      role === 'administrator' || role === 'coordinator'
        ? []
        : ['branch-centro'],
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
  startsOn: new Date('2026-11-01T00:00:00.000Z'),
  endsOn: new Date('2026-11-10T00:00:00.000Z'),
  planEndsOn: new Date('2027-01-30T00:00:00.000Z'),
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
      // Walkthrough finding 53: the dates in words and the new end, never an
      // ISO date, and no «está congelado» before the Freeze starts.
      message:
        'Aprobamos tu congelamiento del 1 al 10 de noviembre. Tu plan ahora vence el 9 de febrero.',
      destination: { type: 'subscription', id: 'subscription-1' },
      occurredAt: new Date('2026-10-23T15:00:00.000Z'),
    });
  });

  // ADR-0108: the Coordinator decides freezes too; no money is involved.
  it('lets the Coordinator refuse', async () => {
    const refuse = jest.fn().mockResolvedValue(undefined);

    await expect(
      decideFreeze(
        { freezeId: freeze.id, decision: 'refused' },
        {
          principal: staff('coordinator'),
          loadFreeze: jest.fn().mockResolvedValue(freeze),
          approve: jest.fn(),
          refuse,
          record: jest.fn().mockResolvedValue(undefined),
          now: () => new Date('2026-10-23T15:00:00.000Z'),
        },
      ),
    ).resolves.toEqual({ state: 'refused' });
    expect(refuse).toHaveBeenCalledWith(
      expect.objectContaining({ decidedByAccountId: 'coordinator-account' }),
    );
  });

  it('refuses an Assistant, a Trainer, a Nutritionist, and a Client', async () => {
    const loadFreeze = jest.fn();
    for (const principal of [
      staff('assistant'),
      staff('trainer'),
      staff('nutritionist'),
      client,
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

  it('names both months when the Freeze crosses one', async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    await decideFreeze(
      { freezeId: freeze.id, decision: 'approved' },
      {
        principal: staff('administrator'),
        loadFreeze: jest.fn().mockResolvedValue({
          ...freeze,
          startsOn: new Date('2026-11-30T00:00:00.000Z'),
          endsOn: new Date('2026-12-04T00:00:00.000Z'),
        }),
        approve: jest.fn().mockResolvedValue(undefined),
        refuse: jest.fn(),
        record,
        now: () => new Date('2026-10-23T15:00:00.000Z'),
      },
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'Aprobamos tu congelamiento del 30 de noviembre al 4 de diciembre. Tu plan ahora vence el 4 de febrero.',
      }),
    );
  });

  it('names a one-day Freeze by its day', async () => {
    const record = jest.fn().mockResolvedValue(undefined);
    await decideFreeze(
      { freezeId: freeze.id, decision: 'approved' },
      {
        principal: staff('administrator'),
        loadFreeze: jest.fn().mockResolvedValue({
          ...freeze,
          startsOn: new Date('2026-11-16T00:00:00.000Z'),
          endsOn: new Date('2026-11-16T00:00:00.000Z'),
        }),
        approve: jest.fn().mockResolvedValue(undefined),
        refuse: jest.fn(),
        record,
        now: () => new Date('2026-10-23T15:00:00.000Z'),
      },
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'Aprobamos tu congelamiento del 16 de noviembre. Tu plan ahora vence el 31 de enero.',
      }),
    );
  });
});
