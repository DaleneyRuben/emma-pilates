import type { AuthenticationEmailJob } from './authentication-email-job';
import type { AuthenticationEmailMessage } from './authentication-email-delivery';
import type { AuthenticationEmailRenderer } from './process-authentication-email';

const subjectByPurpose: Record<AuthenticationEmailJob['purpose'], string> = {
  verification: 'Verify your Pilates account',
  activation: 'Activate your Pilates account',
  password_recovery: 'Reset your Pilates password',
};

// Provisional copy and deep-link format: no approved email content or URL scheme
// exists yet. Replace once real design content lands.
export class PlaceholderAuthenticationEmailRenderer implements AuthenticationEmailRenderer {
  render(input: {
    recipient: string;
    purpose: AuthenticationEmailJob['purpose'];
    linkSecret: string;
  }): AuthenticationEmailMessage {
    return {
      recipient: input.recipient,
      purpose: input.purpose,
      subject: subjectByPurpose[input.purpose],
      link: `pilates://auth/${input.purpose}?token=${input.linkSecret}`,
    };
  }
}
