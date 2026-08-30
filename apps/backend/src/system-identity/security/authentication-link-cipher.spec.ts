import { AuthenticationLinkCipher } from './authentication-link-cipher';

describe('AuthenticationLinkCipher', () => {
  it('encrypts a link secret for the email worker without exposing plaintext', async () => {
    const cipher = new AuthenticationLinkCipher(
      'local-test-key',
      Buffer.alloc(32, 7),
    );

    const encrypted = cipher.encrypt('verification-secret');

    expect(encrypted.encryptionKeyId).toBe('local-test-key');
    expect(encrypted.encryptedLinkSecret).not.toContain('verification-secret');
    await expect(cipher.decrypt(encrypted.encryptedLinkSecret)).resolves.toBe(
      'verification-secret',
    );
  });
});
