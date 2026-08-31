export type ExpiredPendingAccountCleanup = {
  now: Date;
  correlationId: string;
};

type CleanupExpiredPendingAccountsDependencies = {
  gateway: {
    cleanup(request: ExpiredPendingAccountCleanup): Promise<number>;
  };
  now(): Date;
  newId(): string;
};

export class CleanupExpiredPendingAccounts {
  constructor(
    private readonly dependencies: CleanupExpiredPendingAccountsDependencies,
  ) {}

  async execute(): Promise<{ cleaned: number }> {
    const cleaned = await this.dependencies.gateway.cleanup({
      now: this.dependencies.now(),
      correlationId: this.dependencies.newId(),
    });

    return { cleaned };
  }
}
