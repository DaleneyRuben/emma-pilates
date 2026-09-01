import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('SystemIdentityModule', () => {
  it('composes the Account security HTTP boundary and handlers', () => {
    const source = readFileSync(
      join(__dirname, 'system-identity.module.ts'),
      'utf8',
    );

    expect(source).toContain('AccountSecurityController');
    expect(source).toContain('authenticationLinkInspection');
    expect(source).toContain('accountActivation');
    expect(source).toContain('passwordRecoveryRequest');
    expect(source).toContain('passwordRecoveryCompletion');
    expect(source).toContain('currentPasswordChange');
  });
});
