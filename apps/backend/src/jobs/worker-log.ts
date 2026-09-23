import pino, { type DestinationStream } from 'pino';

export type WorkerLogSettings = {
  environment: string;
  release: string;
  destination?: DestinationStream;
};

// ADR-0066/0081: worker records are JSON lines carrying environment, service,
// and release. Records hold identifiers and counts only, never job payloads.
export function createWorkerLog(
  settings: WorkerLogSettings,
): (record: unknown) => void {
  const options = {
    base: {
      environment: settings.environment,
      service: 'worker',
      release: settings.release,
    },
    level: settings.environment === 'test' ? 'silent' : 'info',
  };
  const logger =
    settings.destination === undefined
      ? pino(options)
      : pino(options, settings.destination);

  return (record) => {
    const fields =
      typeof record === 'object' && record !== null
        ? (record as Record<string, unknown>)
        : { record };
    const failed =
      typeof fields.event === 'string' && fields.event.endsWith('_failed');
    if (failed) {
      logger.error(fields);
    } else {
      logger.info(fields);
    }
  };
}
