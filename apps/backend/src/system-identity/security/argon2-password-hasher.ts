import { argon2id, hash, verify } from 'argon2';

export const dummyPasswordHash =
  '$argon2id$v=19$m=65536,p=4,t=3$BwcHBwcHBwcHBwcHBwcHBw$fM3qFg+kwh0qPITChC5AHTtoIRzHtN02Hj9puxGooWk';

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
