import { writeFileSync } from 'node:fs';
import { startDatabaseTestContext } from './database-test-context';

// Run only by interrupted-run.integration-spec.ts, in a child Jest process
// that is interrupted before it can stop the context.
it('holds a disposable database until the run is interrupted', async () => {
  const context = await startDatabaseTestContext();
  writeFileSync(
    process.env.INTERRUPTED_RUN_OUT ?? '',
    new URL(context.databaseUrl).pathname.slice(1),
  );

  if (process.env.INTERRUPTED_RUN_MODE === 'throw') {
    throw new Error('the run failed before stop');
  }
  await new Promise(() => undefined);
});
