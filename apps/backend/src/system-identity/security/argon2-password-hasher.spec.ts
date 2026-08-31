import {
  argon2PasswordHasher,
  dummyPasswordHash,
} from './argon2-password-hasher';

describe('Argon2 password hashing', () => {
  it('stores a password as an Argon2id hash that can be verified', async () => {
    const hash = await argon2PasswordHasher.hash(
      'correct horse battery staple',
    );

    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(
      argon2PasswordHasher.verify(hash, 'correct horse battery staple'),
    ).resolves.toBe(true);
    await expect(
      argon2PasswordHasher.verify(hash, 'incorrect password'),
    ).resolves.toBe(false);
  });

  it('keeps a fixed dummy hash with the same Argon2id cost parameters', async () => {
    expect(dummyPasswordHash).toMatch(/^\$argon2id\$v=19\$m=65536,p=4,t=3\$/);
    await expect(
      argon2PasswordHasher.verify(dummyPasswordHash, 'unknown password'),
    ).resolves.toBe(false);
  });
});
