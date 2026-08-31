export type ClientEmailVerification = {
  verificationDigest: Uint8Array;
  now: Date;
};

export type ClientEmailVerificationStatus = 'verified' | 'expired' | 'invalid';

type VerifyClientEmailDependencies = {
  gateway: {
    verify(
      verification: ClientEmailVerification,
    ): Promise<ClientEmailVerificationStatus>;
  };
  tokens: { digest(secret: string): Uint8Array };
  now(): Date;
};

export class VerifyClientEmail {
  constructor(private readonly dependencies: VerifyClientEmailDependencies) {}

  async execute(command: {
    verificationToken: string;
  }): Promise<{ status: ClientEmailVerificationStatus }> {
    const status = await this.dependencies.gateway.verify({
      verificationDigest: this.dependencies.tokens.digest(
        command.verificationToken,
      ),
      now: this.dependencies.now(),
    });

    return { status };
  }
}
