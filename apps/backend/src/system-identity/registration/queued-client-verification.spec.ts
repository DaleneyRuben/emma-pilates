import { verifyQueuedClientEmail } from './queued-client-verification';

// REL-006: until EXT-001 sends email, an operator confirms a Client's queued
// verification through the API's own endpoint; the secret is never printed.
describe('verifyQueuedClientEmail', () => {
  it("sends the queued secret to the API's verification endpoint", async () => {
    const sent: string[] = [];

    await expect(
      verifyQueuedClientEmail({
        readSecret: () => Promise.resolve('secret/token'),
        verify: (token) => {
          sent.push(token);
          return Promise.resolve('verified');
        },
      }),
    ).resolves.toBe('verified');
    expect(sent).toEqual(['secret/token']);
  });

  it('answers not_found without calling the API when nothing is queued', async () => {
    const verify = jest.fn();

    await expect(
      verifyQueuedClientEmail({
        readSecret: () => Promise.resolve(null),
        verify,
      }),
    ).resolves.toBe('not_found');
    expect(verify).not.toHaveBeenCalled();
  });
});
