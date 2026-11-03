type RetryOptions = {
  sleep?: (milliseconds: number) => Promise<void>;
  /** Another failure that a fresh snapshot can clear, such as a unique code
   * claimed under a snapshot taken before a concurrent commit (BKM-017). */
  retryAlso?: (error: unknown) => boolean;
};

const maxAttempts = 5;

type PrismaFailure = {
  code?: unknown;
  meta?: { driverAdapterError?: { cause?: { originalCode?: unknown } } };
};

// A raw query (such as a FOR UPDATE lock) reports a serialization failure as
// P2010 carrying the PostgreSQL 40001 code instead of P2034.
const isWriteConflict = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  const failure = error as PrismaFailure;

  return (
    failure.code === 'P2034' ||
    (failure.code === 'P2010' &&
      failure.meta?.driverAdapterError?.cause?.originalCode === '40001')
  );
};

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const retrySerializable = async <Result>(
  execute: () => Promise<Result>,
  { sleep = wait, retryAlso = () => false }: RetryOptions = {},
): Promise<Result> => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await execute();
    } catch (error) {
      const retryable = isWriteConflict(error) || retryAlso(error);
      if (!retryable || attempt === maxAttempts - 1) throw error;
      await sleep(10 * 2 ** attempt);
    }
  }

  throw new Error('Unreachable retry state');
};
