import {
  ScriptCommandError,
  parseScriptCommand,
  scriptRunnerCommand,
} from './script-command';

const argvOf = (command: string): string[] => command.split(' ').slice(2);

describe('the Run Script command line', () => {
  it('round-trips the script, its params, the dry run, the rerun, and the run link', () => {
    const command = scriptRunnerCommand({
      scriptName: '20261031-store-review-accounts',
      params: { clientEmail: 'revision-play@emmapilatesstudio.com' },
      dryRun: true,
      forceRerun: true,
      runUrl: 'https://github.com/DaleneyRuben/emma-pilates/actions/runs/1',
    });

    expect(command.startsWith('node dist/src/script-runner-main.js ')).toBe(
      true,
    );
    expect(parseScriptCommand(argvOf(command))).toEqual({
      scriptName: '20261031-store-review-accounts',
      params: { clientEmail: 'revision-play@emmapilatesstudio.com' },
      dryRun: true,
      forceRerun: true,
      runUrl: 'https://github.com/DaleneyRuben/emma-pilates/actions/runs/1',
    });
  });

  // Northflank runs the line through a shell, so nothing typed in the
  // workflow may reach it unencoded.
  it('carries params with quotes and spaces as one base64url word', () => {
    const command = scriptRunnerCommand({
      scriptName: 'demo',
      params: { note: `it's "quoted"; rm -rf /` },
      dryRun: false,
      forceRerun: false,
      runUrl: null,
    });

    expect(command).toMatch(/^[A-Za-z0-9 ._/:=-]+$/);
    expect(parseScriptCommand(argvOf(command)).params).toEqual({
      note: `it's "quoted"; rm -rf /`,
    });
  });

  it('defaults to a real run without params', () => {
    expect(parseScriptCommand(['demo'])).toEqual({
      scriptName: 'demo',
      params: {},
      dryRun: false,
      forceRerun: false,
      runUrl: null,
    });
  });

  it('accepts a name with the .ts extension', () => {
    expect(parseScriptCommand(['demo.ts']).scriptName).toBe('demo');
  });

  it.each([
    [[], 'script_name_missing'],
    [['../etc/passwd'], 'script_name_invalid'],
    [['demo', '--params', 'not-base64-json'], 'params_invalid'],
    [
      ['demo', '--params', Buffer.from('[1]').toString('base64url')],
      'params_invalid',
    ],
    [['demo', '--unknown'], 'argument_unknown'],
  ])('refuses %j with %s', (argv, code) => {
    expect(() => parseScriptCommand(argv)).toThrow(
      expect.objectContaining({ code }) as ScriptCommandError,
    );
  });

  it('refuses params typed in the workflow that are not a JSON object', () => {
    expect(() =>
      scriptRunnerCommand({
        scriptName: 'demo',
        params: JSON.parse('[1]') as Record<string, unknown>,
        dryRun: false,
        forceRerun: false,
        runUrl: null,
      }),
    ).toThrow(expect.objectContaining({ code: 'params_invalid' }) as Error);
  });
});
