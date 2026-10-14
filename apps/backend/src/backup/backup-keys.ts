export type ParsedBackupKey =
  | { kind: 'daily'; database: string; at: Date }
  | { kind: 'monthly'; database: string; month: string };

const notImplemented = (...values: unknown[]): never => {
  throw new Error(`not implemented: ${values.length}`);
};

export const dailyBackupKey = (database: string, at: Date): string =>
  notImplemented(database, at);

export const monthlyBackupKey = (database: string, at: Date): string =>
  notImplemented(database, at);

export const parseBackupKey = (key: string): ParsedBackupKey | null =>
  notImplemented(key);
