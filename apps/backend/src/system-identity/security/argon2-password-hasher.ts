import { argon2id, hash, verify } from 'argon2';

export const hashPassword = (password: string): Promise<string> =>
  hash(password, { type: argon2id });

export const verifyPassword = (
  passwordHash: string,
  password: string,
): Promise<boolean> => verify(passwordHash, password);

export const argon2PasswordHasher = {
  hash: hashPassword,
  verify: verifyPassword,
} as const;
