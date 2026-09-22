import {
  decodeNotificationCursor,
  encodeNotificationCursor,
} from './notification-cursor';

describe('notification cursor', () => {
  it('round trips the creation instant and id', () => {
    const cursor = encodeNotificationCursor({
      createdAt: new Date('2026-09-21T12:00:00.000Z'),
      id: '11111111-1111-4111-8111-111111111111',
    });

    expect(cursor).not.toContain('|');
    expect(decodeNotificationCursor(cursor)).toEqual({
      createdAt: new Date('2026-09-21T12:00:00.000Z'),
      id: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('rejects malformed cursors', () => {
    expect(decodeNotificationCursor('not-a-cursor')).toBeNull();
    expect(
      decodeNotificationCursor(
        Buffer.from('nope|11111111-1111-4111-8111-111111111111').toString(
          'base64url',
        ),
      ),
    ).toBeNull();
    expect(
      decodeNotificationCursor(
        Buffer.from('2026-09-21T12:00:00.000Z|not-a-uuid').toString(
          'base64url',
        ),
      ),
    ).toBeNull();
  });
});
