import { argon2id, hash, verify } from 'argon2';

export class Argon2PasswordHasher {
  hash(password: string): Promise<string> {
    return hash(password, { type: argon2id });
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }
}
