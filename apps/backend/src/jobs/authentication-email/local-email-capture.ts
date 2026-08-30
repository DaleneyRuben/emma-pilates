import type { Environment } from '../../config/environment';
import type {
  AuthenticationEmailDelivery,
  AuthenticationEmailMessage,
} from './authentication-email-delivery';

export class LocalEmailCapture implements AuthenticationEmailDelivery {
  private readonly capturedMessages: AuthenticationEmailMessage[] = [];

  constructor(nodeEnvironment: Environment['NODE_ENV']) {
    if (nodeEnvironment === 'production') {
      throw new Error('Local email capture is unavailable in production');
    }
  }

  deliver(message: AuthenticationEmailMessage): Promise<void> {
    this.capturedMessages.push({ ...message });
    return Promise.resolve();
  }

  messages(): AuthenticationEmailMessage[] {
    return this.capturedMessages.map((message) => ({ ...message }));
  }
}
