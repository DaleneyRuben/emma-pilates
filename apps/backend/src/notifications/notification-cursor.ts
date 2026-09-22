import { z } from 'zod';

export type NotificationCursor = { createdAt: Date; id: string };

const cursorSchema = z.tuple([z.iso.datetime(), z.uuid()]);

export const encodeNotificationCursor = (cursor: NotificationCursor): string =>
  Buffer.from(`${cursor.createdAt.toISOString()}|${cursor.id}`).toString(
    'base64url',
  );

export const decodeNotificationCursor = (
  value: string,
): NotificationCursor | null => {
  const parts = Buffer.from(value, 'base64url').toString('utf8').split('|');
  const result = cursorSchema.safeParse(parts);

  return result.success
    ? { createdAt: new Date(result.data[0]), id: result.data[1] }
    : null;
};
