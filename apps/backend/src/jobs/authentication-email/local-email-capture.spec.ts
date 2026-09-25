import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

  it('also writes each captured message to a file when given a directory, so testers can open the link', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pilates-email-capture-'));
    try {
      const capture = new LocalEmailCapture('development', directory);
      await capture.deliver({
        recipient: 'client@example.com',
        purpose: 'email_change',
        subject: 'Confirma tu correo nuevo',
        link: 'https://links.emmapilates.test/authentication/confirm-email-change?token=s',
      });

      const files = await readdir(directory);
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/email_change-client_at_example\.com\.json$/);
      expect(
        JSON.parse(await readFile(join(directory, files[0]!), 'utf8')),
      ).toEqual({
        recipient: 'client@example.com',
        purpose: 'email_change',
        subject: 'Confirma tu correo nuevo',
        link: 'https://links.emmapilates.test/authentication/confirm-email-change?token=s',
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
