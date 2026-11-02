import { createDatabasePrisma } from './database/database-clients';
import { runScript } from './script-runner/run-script';
import {
  parseScriptCommand,
  ScriptCommandError,
} from './deployment/script-command';
import { createPrismaScriptRunStore } from './script-runner/prisma-script-run-store';
import { scripts } from './script-runner/scripts';
import { validateScriptEnvironment } from './script-runner/script-environment';

// REL-016: runs one script from src/script-runner/scripts as a Northflank
// job run, started by the Run Script workflow (docs/runbooks/run-script.md).
// It logs JSON lines and exits 1 when the script was refused or failed.
const log = (event: string, fields: Record<string, unknown> = {}): void =>
  console.log(JSON.stringify({ event, ...fields }));

async function main(): Promise<void> {
  const command = parseScriptCommand(process.argv.slice(2));
  const environment = validateScriptEnvironment(process.env);
  const prisma = createDatabasePrisma('script-runner', environment);
  try {
    log('script_started', {
      script: command.scriptName,
      dryRun: command.dryRun,
      forceRerun: command.forceRerun,
      runUrl: command.runUrl,
    });
    const result = await runScript({
      command,
      scripts,
      store: createPrismaScriptRunStore(prisma),
      prisma,
      now: () => new Date(),
      log,
    });
    log(`script_${result.outcome}`, { script: command.scriptName, ...result });
    process.exitCode = result.outcome === 'success' ? 0 : 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  log('script_runner_failed', {
    type: error instanceof Error ? error.name : typeof error,
    code: error instanceof ScriptCommandError ? error.code : undefined,
  });
  process.exitCode = 1;
});
