import { runAdministratorBootstrapCommand } from './administrator-bootstrap-command';
import {
  AdministratorAlreadyActiveError,
  BootstrapEmailInUseError,
  BootstrapEmailThrottledError,
  BootstrapPendingForAnotherEmailError,
} from './bootstrap-first-administrator';

const activationExpiresAt = new Date('2026-09-30T12:00:00.000Z');

describe('runAdministratorBootstrapCommand', () => {
  it('bootstraps the configured Administrator and reports the outcome without the email', async () => {
    const bootstrap = jest.fn().mockResolvedValue({
      status: 'created',
      accountId: 'account-1',
      staffMemberId: 'staff-1',
      email: 'emma@example.com',
      activationExpiresAt,
    });
    const report = jest.fn();

    const exitCode = await runAdministratorBootstrapCommand(
      {
        BOOTSTRAP_ADMINISTRATOR_EMAIL: ' Emma@Example.com ',
        BOOTSTRAP_ADMINISTRATOR_NAME: ' Emma Díaz ',
      },
      { bootstrap, report },
    );

    expect(exitCode).toBe(0);
    expect(bootstrap).toHaveBeenCalledWith({
      email: 'emma@example.com',
      name: 'Emma Díaz',
    });
    expect(report).toHaveBeenCalledWith({
      event: 'administrator_bootstrap_completed',
      status: 'created',
      accountId: 'account-1',
      staffMemberId: 'staff-1',
      activationExpiresAt: '2026-09-30T12:00:00.000Z',
    });
  });

  it('refuses invalid configuration without bootstrapping and names only the fields', async () => {
    const bootstrap = jest.fn();
    const report = jest.fn();

    const exitCode = await runAdministratorBootstrapCommand(
      { BOOTSTRAP_ADMINISTRATOR_EMAIL: 'not-an-email' },
      { bootstrap, report },
    );

    expect(exitCode).toBe(1);
    expect(bootstrap).not.toHaveBeenCalled();
    expect(report).toHaveBeenCalledWith({
      event: 'administrator_bootstrap_invalid_configuration',
      fields: ['BOOTSTRAP_ADMINISTRATOR_EMAIL', 'BOOTSTRAP_ADMINISTRATOR_NAME'],
    });
  });

  it.each([
    [new AdministratorAlreadyActiveError(), 'administrator_already_active'],
    [
      new BootstrapPendingForAnotherEmailError(),
      'bootstrap_pending_for_another_email',
    ],
    [new BootstrapEmailInUseError(), 'email_in_use'],
    [new BootstrapEmailThrottledError(), 'email_throttled'],
  ])('reports a refused bootstrap as %s', async (error, reason) => {
    const report = jest.fn();

    const exitCode = await runAdministratorBootstrapCommand(
      {
        BOOTSTRAP_ADMINISTRATOR_EMAIL: 'emma@example.com',
        BOOTSTRAP_ADMINISTRATOR_NAME: 'Emma Díaz',
      },
      { bootstrap: jest.fn().mockRejectedValue(error), report },
    );

    expect(exitCode).toBe(1);
    expect(report).toHaveBeenCalledWith({
      event: 'administrator_bootstrap_refused',
      reason,
    });
  });

  it('lets unexpected failures escape', async () => {
    await expect(
      runAdministratorBootstrapCommand(
        {
          BOOTSTRAP_ADMINISTRATOR_EMAIL: 'emma@example.com',
          BOOTSTRAP_ADMINISTRATOR_NAME: 'Emma Díaz',
        },
        {
          bootstrap: jest.fn().mockRejectedValue(new Error('connection lost')),
          report: jest.fn(),
        },
      ),
    ).rejects.toThrow('connection lost');
  });
});
