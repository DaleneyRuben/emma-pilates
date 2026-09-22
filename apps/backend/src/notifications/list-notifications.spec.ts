import { listNotifications } from './list-notifications';

const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};

const notification = (index: number) => ({
  id: `00000000-0000-4000-8000-00000000000${index}`,
  category: 'booking_schedule' as const,
  type: 'waitlist_promoted',
  title: 'Cupo liberado',
  message: `Mensaje ${index}`,
  destinationType: 'booking',
  destinationId: null,
  createdAt: new Date(`2026-09-2${index}T12:00:00.000Z`),
  readAt: null,
});

describe('listNotifications', () => {
  it('returns one page for the authenticated Account with the next cursor', async () => {
    const rows = [notification(3), notification(2), notification(1)];
    const findPage = jest.fn().mockResolvedValue(rows);

    const page = await listNotifications(
      { limit: 2, cursor: null },
      { principal, findPage },
    );

    expect(findPage).toHaveBeenCalledWith({
      accountId: 'account-id',
      after: null,
      limit: 3,
    });
    expect(page.items).toEqual(rows.slice(0, 2));
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toEqual(expect.any(String));
  });

  it('returns no cursor on the last page', async () => {
    const rows = [notification(1)];

    const page = await listNotifications(
      { limit: 20, cursor: null },
      { principal, findPage: jest.fn().mockResolvedValue(rows) },
    );

    expect(page).toEqual({ items: rows, hasMore: false, nextCursor: null });
  });

  it('rejects an invalid cursor', async () => {
    await expect(
      listNotifications(
        { limit: 20, cursor: 'garbage' },
        { principal, findPage: jest.fn() },
      ),
    ).rejects.toThrow('Invalid notification cursor');
  });
});
