export type PendingClientRegistrationCancellation = {
  continuationDigest: Uint8Array;
  now: Date;
  correlationId: string;
};

export type PendingClientRegistrationCancellationStatus =
  'cancelled' | 'expired';

type CancelPendingClientRegistrationDependencies = {
  gateway: {
    cancel(
      cancellation: PendingClientRegistrationCancellation,
    ): Promise<PendingClientRegistrationCancellationStatus>;
  };
  tokens: { digest(secret: string): Uint8Array };
  now(): Date;
  newId(): string;
};

export class CancelPendingClientRegistration {
  constructor(
    private readonly dependencies: CancelPendingClientRegistrationDependencies,
  ) {}

  async execute(command: {
    registrationContinuation: string;
  }): Promise<{ status: PendingClientRegistrationCancellationStatus }> {
    const status = await this.dependencies.gateway.cancel({
      continuationDigest: this.dependencies.tokens.digest(
        command.registrationContinuation,
      ),
      now: this.dependencies.now(),
      correlationId: this.dependencies.newId(),
    });

    return { status };
  }
}
