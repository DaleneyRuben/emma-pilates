import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { AdministrationError } from '../administration/administration-errors';
import { recordAdministratorAdjustment } from './record-allowance-adjustment';

const staff = (
  role: 'assistant' | 'administrator' | 'trainer' | 'nutritionist',
): AuthenticatedPrincipal => ({
  accountId: `${role}-account`,
  authenticationSessionId: 'session',
  identity: {
    kind: 'staff',
    staffMemberId: `${role}-staff`,
    role,
    branchIds: role === 'administrator' ? [] : ['branch'],
  },
});

const dependencies = (principal: AuthenticatedPrincipal) => ({
  principal,
  now: new Date('2026-10-23T15:00:00.000Z'),
  findSubscription: jest.fn().mockResolvedValue({ id: 'subscription-id' }),
  record: jest.fn().mockResolvedValue({
    id: 'adjustment-id',
    classes: 1,
    reason: 'courtesy',
  }),
});

describe('recordAdministratorAdjustment', () => {
  it.each(['assistant', 'trainer', 'nutritionist'] as const)(
    'refuses a %s',
    async (role) => {
      const deps = dependencies(staff(role));

      await expect(
        recordAdministratorAdjustment(
          { clientId: 'client-id', classes: 1, reason: 'courtesy' },
          deps,
        ),
      ).rejects.toMatchObject({ code: 'administration_access_denied' });
      await expect(
        recordAdministratorAdjustment(
          { clientId: 'client-id', classes: 1, reason: 'class_return' },
          deps,
        ),
      ).rejects.toBeInstanceOf(AdministrationError);
      expect(deps.record).not.toHaveBeenCalled();
    },
  );

  it('records a courtesy for an Administrator', async () => {
    const deps = dependencies(staff('administrator'));

    await expect(
      recordAdministratorAdjustment(
        { clientId: 'client-id', classes: 1, reason: 'courtesy' },
        deps,
      ),
    ).resolves.toMatchObject({ id: 'adjustment-id' });
    expect(deps.record).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'courtesy',
        authorAccountId: 'administrator-account',
      }),
    );
  });

  it('refuses a gift, which only the system grants', async () => {
    const deps = dependencies(staff('administrator'));

    await expect(
      recordAdministratorAdjustment(
        {
          clientId: 'client-id',
          classes: 1,
          reason: 'gift_new_client' as 'courtesy',
        },
        deps,
      ),
    ).rejects.toMatchObject({ code: 'invalid_adjustment' });
  });
});
