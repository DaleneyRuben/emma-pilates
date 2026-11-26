import { UnauthorizedException } from '@nestjs/common';
import { NotificationNotFoundError } from './mark-notification-read';
import { NotificationRemovalController } from './notification-removal.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};
const notificationId = '11111111-1111-4111-8111-111111111111';

describe('NotificationRemovalController', () => {
  const resolvePrincipal = jest.fn().mockResolvedValue(principal);
  const remove = jest.fn();
  const restore = jest.fn();
  const controller = new NotificationRemovalController(
    remove,
    restore,
    resolvePrincipal,
  );

  beforeEach(() => {
    remove.mockReset();
    restore.mockReset();
  });

  it('removes one notification and maps an unknown one to not found', async () => {
    remove.mockResolvedValue(undefined);
    await expect(
      controller.remove(notificationId, bearer),
    ).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith({ notificationId }, principal);

    remove.mockRejectedValue(new NotificationNotFoundError());
    await expect(
      controller.remove(notificationId, bearer),
    ).rejects.toMatchObject({
      response: { code: 'notification_not_found' },
      status: 404,
    });
    await expect(controller.remove('nope', bearer)).rejects.toMatchObject({
      response: { code: 'invalid_request' },
      status: 400,
    });
  });

  it('restores a removed notification and requires a bearer credential', async () => {
    restore.mockResolvedValue(undefined);
    await expect(
      controller.restore(notificationId, bearer),
    ).resolves.toBeUndefined();
    expect(restore).toHaveBeenCalledWith({ notificationId }, principal);

    restore.mockRejectedValue(new NotificationNotFoundError());
    await expect(
      controller.restore(notificationId, bearer),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      controller.restore(notificationId, undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
