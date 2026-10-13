import { createHeartbeatPing } from './heartbeat-ping';

const heartbeatUrl = 'https://uptime.example.com/api/v1/heartbeat/abc';

describe('heartbeat ping', () => {
  it('does nothing without a heartbeat URL', async () => {
    const fetch = jest.fn();

    await createHeartbeatPing(null, { fetch, emit: jest.fn() })();

    expect(fetch).not.toHaveBeenCalled();
  });

  it('requests the heartbeat URL with a timeout', async () => {
    const fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await createHeartbeatPing(heartbeatUrl, { fetch, emit: jest.fn() })();

    expect(fetch).toHaveBeenCalledWith(heartbeatUrl, {
      method: 'GET',
      signal: expect.any(AbortSignal) as AbortSignal,
    });
  });

  // The URL is a credential for the monitor, so it never reaches the logs.
  it('records a failed ping without the URL and without throwing', async () => {
    const emit = jest.fn();
    const failing = jest.fn().mockRejectedValue(new Error('getaddrinfo'));
    const rejected = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    await createHeartbeatPing(heartbeatUrl, { fetch: failing, emit })();
    await createHeartbeatPing(heartbeatUrl, { fetch: rejected, emit })();

    expect(emit).toHaveBeenNthCalledWith(1, {
      event: 'worker_heartbeat_ping_failed',
    });
    expect(emit).toHaveBeenNthCalledWith(2, {
      event: 'worker_heartbeat_ping_failed',
      status: 404,
    });
    expect(JSON.stringify(emit.mock.calls)).not.toContain('abc');
  });
});
