// The command a Run Script dispatch gives Northflank's job run (REL-016). The
// job runs it through a shell, so the params travel as one base64url word and
// the name is checked against a strict pattern before it is used.
export type ScriptCommand = {
  scriptName: string;
  params: Record<string, unknown>;
  dryRun: boolean;
  forceRerun: boolean;
  runUrl: string | null;
};

export class ScriptCommandError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

const entrypoint = 'node dist/src/script-runner-main.js';
const namePattern = /^[a-z0-9][a-z0-9-]{0,99}$/;
const urlPattern = /^https:\/\/[A-Za-z0-9./_-]+$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const checkedName = (raw: string | undefined): string => {
  if (raw === undefined || raw === '') {
    throw new ScriptCommandError('script_name_missing');
  }
  const name = raw.endsWith('.ts') ? raw.slice(0, -3) : raw;
  if (!namePattern.test(name)) {
    throw new ScriptCommandError('script_name_invalid');
  }
  return name;
};

const decodedParams = (word: string | undefined): Record<string, unknown> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(word ?? '', 'base64url').toString('utf8'));
  } catch {
    throw new ScriptCommandError('params_invalid');
  }
  if (!isObject(parsed)) throw new ScriptCommandError('params_invalid');
  return parsed;
};

export const scriptRunnerCommand = (input: ScriptCommand): string => {
  if (!isObject(input.params)) throw new ScriptCommandError('params_invalid');
  const words = [entrypoint, checkedName(input.scriptName)];
  if (Object.keys(input.params).length > 0) {
    words.push(
      '--params',
      Buffer.from(JSON.stringify(input.params)).toString('base64url'),
    );
  }
  if (input.dryRun) words.push('--dry-run');
  if (input.forceRerun) words.push('--force-rerun');
  if (input.runUrl !== null) {
    if (!urlPattern.test(input.runUrl)) {
      throw new ScriptCommandError('run_url_invalid');
    }
    words.push('--run-url', input.runUrl);
  }
  return words.join(' ');
};

export const parseScriptCommand = (argv: string[]): ScriptCommand => {
  const [name, ...rest] = argv;
  const command: ScriptCommand = {
    scriptName: checkedName(name),
    params: {},
    dryRun: false,
    forceRerun: false,
    runUrl: null,
  };
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === '--params') {
      index += 1;
      command.params = decodedParams(rest[index]);
    } else if (argument === '--run-url') {
      index += 1;
      command.runUrl = rest[index] ?? null;
    } else if (argument === '--dry-run') {
      command.dryRun = true;
    } else if (argument === '--force-rerun') {
      command.forceRerun = true;
    } else {
      throw new ScriptCommandError('argument_unknown');
    }
  }
  return command;
};
