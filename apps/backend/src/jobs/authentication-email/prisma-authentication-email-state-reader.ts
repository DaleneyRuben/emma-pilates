import type { AuthenticationEmailStateReader } from './process-authentication-email';

export class PrismaAuthenticationEmailStateReader implements AuthenticationEmailStateReader {
  constructor(_prisma: unknown) {}

  find(): Promise<never> {
    return Promise.reject(new Error('Not implemented'));
  }
}
