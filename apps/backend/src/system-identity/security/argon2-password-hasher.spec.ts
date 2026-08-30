import { Argon2PasswordHasher } from './argon2-password-hasher';

describe('Argon2PasswordHasher', () => {
  it('stores a password as an Argon2id hash that can be verified', async () => {
    const hasher = new Argon2PasswordHasher();

    const hash = await hasher.hash('correct horse battery staple');

    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(
      hasher.verify(hash, 'correct horse battery staple'),
    ).resolves.toBe(true);
    await expect(hasher.verify(hash, 'incorrect password')).resolves.toBe(
      false,
    );
  });
});
