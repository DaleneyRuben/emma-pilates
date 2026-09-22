type RetryOptions = {
  sleep?: (milliseconds: number) => Promise<void>;
};

const maxAttempts = 5;

const isWriteConflict = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'P2034';

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const retrySerializable = async <Result>(
  execute: () => Promise<Result>,
  { sleep = wait }: RetryOptions = {},
): Promise<Result> => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await execute();
    } catch (error) {
      if (!isWriteConflict(error) || attempt === maxAttempts - 1) throw error;
      await sleep(10 * 2 ** attempt);
    }
  }

  throw new Error('Unreachable retry state');
};
