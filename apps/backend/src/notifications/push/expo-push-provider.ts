import type { PushProvider } from './push-provider';

export const createExpoPushProvider = (options: {
  fetch: typeof fetch;
  accessToken: string | null;
}): PushProvider => ({
  send: () =>
    Promise.reject(new Error(`not implemented ${typeof options.fetch}`)),
  getReceipts: () => Promise.reject(new Error('not implemented')),
});
