import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Environment } from '../../config/environment';
import type {
  AuthenticationEmailDelivery,
  AuthenticationEmailMessage,
} from './authentication-email-delivery';

// Local development only: keeps every delivered message in memory and, when a
// directory is given, as one JSON file per message so a tester can open the
// link (the secret is the link itself; the directory lives under .data/).
export class LocalEmailCapture implements AuthenticationEmailDelivery {
  private readonly capturedMessages: AuthenticationEmailMessage[] = [];

  constructor(
    nodeEnvironment: Environment['NODE_ENV'],
    private readonly directory?: string,
  ) {
    if (nodeEnvironment === 'production') {
      throw new Error('Local email capture is unavailable in production');
    }
  }

  async deliver(message: AuthenticationEmailMessage): Promise<void> {
    this.capturedMessages.push({ ...message });
    if (this.directory === undefined) return;
    await mkdir(this.directory, { recursive: true });
    const recipient = message.recipient
      .replace('@', '_at_')
      .replace(/[^a-z0-9._-]/gi, '_');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await writeFile(
      join(this.directory, `${stamp}-${message.purpose}-${recipient}.json`),
      JSON.stringify(message, null, 2),
    );
  }

  messages(): AuthenticationEmailMessage[] {
    return this.capturedMessages.map((message) => ({ ...message }));
  }
}
