import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const initializationVectorLength = 12;
const authenticationTagLength = 16;

export type EncryptedAuthenticationLink = {
  encryptionKeyId: string;
  encryptedLinkSecret: string;
};

export class AuthenticationLinkCipher {
  constructor(
    private readonly keyId: string,
    private readonly key: Uint8Array,
  ) {
    if (key.length !== 32) {
      throw new Error('Authentication link encryption key must be 32 bytes');
    }
  }

  encrypt(secret: string): EncryptedAuthenticationLink {
    const initializationVector = randomBytes(initializationVectorLength);
    const cipher = createCipheriv(
      'aes-256-gcm',
      this.key,
      initializationVector,
    );
    const ciphertext = Buffer.concat([
      cipher.update(secret, 'utf8'),
      cipher.final(),
    ]);
    const payload = Buffer.concat([
      initializationVector,
      cipher.getAuthTag(),
      ciphertext,
    ]);

    return {
      encryptionKeyId: this.keyId,
      encryptedLinkSecret: payload.toString('base64url'),
    };
  }

  decrypt(ciphertext: string, keyId = this.keyId): Promise<string> {
    if (keyId !== this.keyId) {
      throw new Error('Unknown authentication link encryption key');
    }

    const payload = Buffer.from(ciphertext, 'base64url');
    const initializationVector = payload.subarray(
      0,
      initializationVectorLength,
    );
    const authenticationTag = payload.subarray(
      initializationVectorLength,
      initializationVectorLength + authenticationTagLength,
    );
    const encryptedSecret = payload.subarray(
      initializationVectorLength + authenticationTagLength,
    );
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      initializationVector,
    );
    decipher.setAuthTag(authenticationTag);

    return Promise.resolve(
      Buffer.concat([
        decipher.update(encryptedSecret),
        decipher.final(),
      ]).toString('utf8'),
    );
  }
}
