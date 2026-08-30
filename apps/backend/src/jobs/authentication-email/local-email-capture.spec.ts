import { LocalEmailCapture } from './local-email-capture';

describe('local authentication email capture', () => {
  it('captures a delivered authentication link for local journeys', async () => {
    const capture = new LocalEmailCapture('test');
    const message = {
      recipient: 'client@example.com',
      purpose: 'verification' as const,
      subject: 'Verify your Pilates account',
      link: 'pilates://verify?token=local-secret',
    };

    await capture.deliver(message);

    expect(capture.messages()).toEqual([message]);
  });

  it('does not expose mutable captured state', async () => {
    const capture = new LocalEmailCapture('development');
    const message = {
      recipient: 'staff@example.com',
      purpose: 'activation' as const,
      subject: 'Activate your Pilates account',
      link: 'pilates://activate?token=local-secret',
    };

    await capture.deliver(message);
    message.subject = 'changed outside capture';

    expect(capture.messages()[0]?.subject).toBe(
      'Activate your Pilates account',
    );
  });

  it('refuses to start in production', () => {
    expect(() => new LocalEmailCapture('production')).toThrow(
      'Local email capture is unavailable in production',
    );
  });
});
