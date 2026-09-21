import { PlaceholderAuthenticationEmailRenderer } from './placeholder-authentication-email-renderer';

describe('PlaceholderAuthenticationEmailRenderer', () => {
  const renderer = new PlaceholderAuthenticationEmailRenderer();

  it('renders a verification message with a deep link carrying the link secret', () => {
    expect(
      renderer.render({
        recipient: 'client@example.com',
        purpose: 'verification',
        linkSecret: 'secret-token',
      }),
    ).toEqual({
      recipient: 'client@example.com',
      purpose: 'verification',
      subject: 'Verify your Pilates account',
      link: 'pilates://auth/verification?token=secret-token',
    });
  });

  it('renders an activation message', () => {
    expect(
      renderer.render({
        recipient: 'staff@example.com',
        purpose: 'activation',
        linkSecret: 'secret-token',
      }),
    ).toEqual({
      recipient: 'staff@example.com',
      purpose: 'activation',
      subject: 'Activate your Pilates account',
      link: 'pilates://auth/activation?token=secret-token',
    });
  });

  it('renders a password recovery message', () => {
    expect(
      renderer.render({
        recipient: 'client@example.com',
        purpose: 'password_recovery',
        linkSecret: 'secret-token',
      }),
    ).toEqual({
      recipient: 'client@example.com',
      purpose: 'password_recovery',
      subject: 'Reset your Pilates password',
      link: 'pilates://auth/password_recovery?token=secret-token',
    });
  });
});
