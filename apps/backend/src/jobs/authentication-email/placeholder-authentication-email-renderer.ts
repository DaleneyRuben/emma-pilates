import type { AuthenticationEmailJob } from './authentication-email-job';
import type { AuthenticationEmailMessage } from './authentication-email-delivery';
import type {
  AuthenticationEmailRenderInput,
  AuthenticationEmailRenderer,
} from './process-authentication-email';

const subjectByPurpose: Record<AuthenticationEmailJob['purpose'], string> = {
  verification: 'Verify your Pilates account',
  activation: 'Activate your Pilates account',
  password_recovery: 'Reset your Pilates password',
  email_change: 'Confirm your new Pilates email',
  email_change_notice: 'Your Pilates email is being changed',
};

// Provisional copy and deep-link format: no approved email content or URL scheme
// exists yet. Replace once real design content lands.
export class PlaceholderAuthenticationEmailRenderer implements AuthenticationEmailRenderer {
  render(input: AuthenticationEmailRenderInput): AuthenticationEmailMessage {
    return {
      recipient: input.recipient,
      purpose: input.purpose,
      subject: subjectByPurpose[input.purpose],
      link:
        input.linkSecret === null
          ? ''
          : `pilates://auth/${input.purpose}?token=${input.linkSecret}`,
    };
  }
}
