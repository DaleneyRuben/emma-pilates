import { HttpException } from '@nestjs/common';
import { ClientFreezesController } from './freeze.controller';

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
