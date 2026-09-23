import { Writable } from 'node:stream';
import { createWorkerLog } from './worker-log';

function capture() {
  const lines: Record<string, unknown>[] = [];
  const destination = new Writable({
    write(chunk: Buffer, _encoding, done) {
      for (const line of chunk.toString().split('\n').filter(Boolean)) {
        lines.push(JSON.parse(line) as Record<string, unknown>);
      }
      done();
    },
  });
  return { lines, destination };
}

describe('createWorkerLog', () => {
  it('writes each worker record as one JSON line with the service identity', () => {
    const { lines, destination } = capture();
    const emit = createWorkerLog({
      environment: 'production',
      release: 'release-42',
      destination,
    });

    emit({ event: 'worker_heartbeat', serviceVersion: '0.0.0' });

    expect(lines).toEqual([
      expect.objectContaining({
        level: 30,
        environment: 'production',
        service: 'worker',
        release: 'release-42',
        event: 'worker_heartbeat',
      }),
    ]);
  });

  it('reports failed job runs at error level', () => {
    const { lines, destination } = capture();
    const emit = createWorkerLog({
      environment: 'production',
      release: 'release-42',
      destination,
    });

    emit({ event: 'subscription_reminders_failed', serviceVersion: '0.0.0' });

    expect(lines[0]).toMatchObject({
      level: 50,
      event: 'subscription_reminders_failed',
    });
  });
});
