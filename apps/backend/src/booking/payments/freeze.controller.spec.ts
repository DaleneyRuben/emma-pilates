import { HttpException } from '@nestjs/common';
import {
  AdministratorFreezesController,
  ClientFreezesController,
} from './freeze.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const subscriptionId = '22222222-2222-4222-8222-222222222222';

describe('requestFreeze civil dates', () => {
  it('answers 400 for a calendar date that does not exist', async () => {
    const requestFreeze = jest.fn();
    const controller = new ClientFreezesController(
      { requestFreeze } as never,
      jest.fn().mockResolvedValue({
        accountId: 'account-id',
        authenticationSessionId: 'authentication-session-id',
        identity: { kind: 'client', clientId: 'client-id' },
      }),
    );

    await expect(
      controller.request(bearer, {
        subscriptionId,
        startsOn: '2026-02-31',
        endsOn: '2026-03-05',
        reason: 'Viaje',
      }),
    ).rejects.toBeInstanceOf(HttpException);
    await expect(
      controller.request(bearer, {
        subscriptionId,
        startsOn: '2026-02-31',
        endsOn: '2026-03-05',
        reason: 'Viaje',
      }),
    ).rejects.toMatchObject({
      status: 400,
      response: { code: 'invalid_civil_date' },
    });
    expect(requestFreeze).not.toHaveBeenCalled();
  });
});

// E9 (staff redesign): the refusal reason travels with the decision and only
// with a refusal; it is not stored on the Freeze row (no column yet).
describe('decideFreeze refusal reason', () => {
  const freezeId = '33333333-3333-4333-8333-333333333333';
  const administrator = {
    accountId: 'account-id',
    authenticationSessionId: 'authentication-session-id',
    identity: {
      kind: 'staff',
      staffMemberId: 'staff-id',
      role: 'administrator',
      branchIds: [],
    },
  };
  const controllerWith = (decideFreeze: jest.Mock) =>
    new AdministratorFreezesController(
      { decideFreeze } as never,
      jest.fn().mockResolvedValue(administrator),
    );

  it('passes the refusal reason, trimmed, to the command', async () => {
    const decideFreeze = jest.fn().mockResolvedValue({ state: 'refused' });

    await controllerWith(decideFreeze).decide(freezeId, bearer, {
      decision: 'refused',
      refusalReason: '  Faltan días de aviso.  ',
    });

    expect(decideFreeze).toHaveBeenCalledWith(
      {
        freezeId,
        decision: 'refused',
        refusalReason: 'Faltan días de aviso.',
      },
      administrator,
    );
  });

  it('still decides without a reason', async () => {
    const decideFreeze = jest.fn().mockResolvedValue({ state: 'refused' });

    await controllerWith(decideFreeze).decide(freezeId, bearer, {
      decision: 'refused',
    });

    expect(decideFreeze).toHaveBeenCalledWith(
      { freezeId, decision: 'refused' },
      administrator,
    );
  });

  it.each([
    ['an approval', { decision: 'approved', refusalReason: 'Viaje' }],
    ['a blank reason', { decision: 'refused', refusalReason: '   ' }],
    [
      'a reason over 300 characters',
      { decision: 'refused', refusalReason: 'a'.repeat(301) },
    ],
  ])('answers 400 for a refusal reason on %s', async (_case, body) => {
    const decideFreeze = jest.fn();

    await expect(
      controllerWith(decideFreeze).decide(freezeId, bearer, body),
    ).rejects.toMatchObject({ status: 400 });
    expect(decideFreeze).not.toHaveBeenCalled();
  });
});
