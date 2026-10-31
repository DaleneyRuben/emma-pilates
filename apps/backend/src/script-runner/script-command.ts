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

export const scriptRunnerCommand = (input: ScriptCommand): string => {
  throw new ScriptCommandError(`not_implemented ${input.scriptName}`);
};

export const parseScriptCommand = (argv: string[]): ScriptCommand => {
  throw new ScriptCommandError(`not_implemented ${argv.length}`);
};
