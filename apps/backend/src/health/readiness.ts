export type ReadinessInput = {
  appliedMigrations: () => Promise<readonly string[]>;
  expectedMigrations: readonly string[] | null;
  shuttingDown: () => boolean;
  timeoutMs: number;
};

// ADR-0080: ready means accepting work, PostgreSQL reachable within a short
// timeout, and every migration shipped with this build applied. A missing
// migration list (null) means startup initialization failed.
export async function checkReadiness(input: ReadinessInput): Promise<boolean> {
  if (input.shuttingDown() || input.expectedMigrations === null) {
    return false;
  }
  const expected = input.expectedMigrations;
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), input.timeoutMs);
  });

  try {
    const applied = await Promise.race([input.appliedMigrations(), timeout]);
    if (applied === null) {
      return false;
    }
    const appliedSet = new Set(applied);
    return expected.every((migration) => appliedSet.has(migration));
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
