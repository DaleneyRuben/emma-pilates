export type PushPayload = {
  notificationId: string;
  type: string;
  destinationType: string | null;
  destinationId: string | null;
};

export function parsePushPayload(value: unknown): PushPayload | null {
  return value === undefined ? null : null;
}
