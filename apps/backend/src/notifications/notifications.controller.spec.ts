import { UnauthorizedException } from '@nestjs/common';
import { NotificationNotFoundError } from './mark-notification-read';
import { NotificationsController } from './notifications.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};
const notificationId = '11111111-1111-4111-8111-111111111111';

describe('NotificationsController', () => {
  const resolvePrincipal = jest.fn().mockResolvedValue(principal);
  const list = jest.fn();
  const countUnread = jest.fn();
  const markRead = jest.fn();
  const markAllRead = jest.fn();
  const controller = new NotificationsController(
    list,
    countUnread,
    markRead,
    markAllRead,
    resolvePrincipal,
  );

  beforeEach(() => {
    list.mockReset();
    countUnread.mockReset();
    markRead.mockReset();
    markAllRead.mockReset();
  });

  it('lists a page with the default limit and passes the cursor through', async () => {
    const page = { items: [], hasMore: false, nextCursor: null };
    list.mockResolvedValue(page);

    await expect(controller.list(bearer, {})).resolves.toEqual(page);
    expect(list).toHaveBeenCalledWith({ limit: 20, cursor: null }, principal);

    await controller.list(bearer, { limit: '5', cursor: 'abc' });
    expect(list).toHaveBeenLastCalledWith(
      { limit: 5, cursor: 'abc' },
      principal,
    );
  });

  it('rejects an invalid page size or cursor', async () => {
    await expect(controller.list(bearer, { limit: '0' })).rejects.toMatchObject(
      {
        response: { code: 'invalid_request' },
        status: 400,
      },
    );
    list.mockRejectedValue(new Error('Invalid notification cursor'));
    await expect(
      controller.list(bearer, { cursor: 'garbage' }),
    ).rejects.toMatchObject({
      response: { code: 'invalid_cursor' },
      status: 400,
    });
  });

  it('reports the unread count', async () => {
    countUnread.mockResolvedValue(3);

    await expect(controller.unreadCount(bearer)).resolves.toEqual({
      unread: 3,
    });
    expect(countUnread).toHaveBeenCalledWith(principal);
  });

  it('marks one notification read and maps unknown ones to not found', async () => {
    markRead.mockResolvedValue(undefined);
    await expect(
      controller.markRead(notificationId, bearer),
    ).resolves.toBeUndefined();
    expect(markRead).toHaveBeenCalledWith({ notificationId }, principal);

    markRead.mockRejectedValue(new NotificationNotFoundError());
    await expect(
      controller.markRead(notificationId, bearer),
    ).rejects.toMatchObject({
      response: { code: 'notification_not_found' },
      status: 404,
    });
    await expect(controller.markRead('nope', bearer)).rejects.toMatchObject({
      response: { code: 'invalid_request' },
      status: 400,
    });
  });

  it('marks all notifications read and requires a bearer credential', async () => {
    markAllRead.mockResolvedValue({ marked: 2 });

    await expect(controller.markAllRead(bearer)).resolves.toEqual({
      marked: 2,
    });
    await expect(controller.markAllRead(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
