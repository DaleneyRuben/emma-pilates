import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { AdministrationError } from '../administration/administration-errors';
import { grantCampaign } from './grant-campaign';

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

const coordinator = {
  accountId: 'coordinator-account',
  authenticationSessionId: 'session',
  identity: {
    kind: 'staff',
    staffMemberId: 'coordinator-staff',
    role: 'coordinator',
    branchIds: ['branch'],
  },
} as unknown as AuthenticatedPrincipal;

type Recipient = { clientId: string; name: string; subscriptionId: string };

const dependencies = (
  principal: AuthenticatedPrincipal,
  recipients: readonly Recipient[],
) => ({
  principal,
  now: new Date('2026-10-23T15:00:00.000Z'),
  today: new Date('2026-10-23T00:00:00.000Z'),
  findRecipients: jest.fn().mockResolvedValue(recipients),
  findSkipped: jest.fn().mockResolvedValue([]),
  record: jest.fn().mockImplementation((input: { clientId: string }) =>
    Promise.resolve({
      id: `adjustment-${input.clientId}`,
      classes: 1,
      reason: 'campaign' as const,
    }),
  ),
});

describe('grantCampaign', () => {
  it('grants one campaign class to every Client with a live Subscription and names who was skipped', async () => {
    const deps = dependencies(staff('administrator'), [
      {
        clientId: 'live-client',
        name: 'Lucía',
        subscriptionId: 'live-subscription',
      },
    ]);
    deps.findSkipped.mockResolvedValue([
      { clientId: 'waiting-client', name: 'Sofía' },
    ]);

    await expect(
      grantCampaign(
        { name: 'Inicio de año', classes: 1, idempotencyKey: 'key' },
        deps,
      ),
    ).resolves.toEqual({
      name: 'Inicio de año',
      classes: 1,
      granted: [{ clientId: 'live-client', name: 'Lucía' }],
      skipped: [{ clientId: 'waiting-client', name: 'Sofía' }],
    });
    expect(deps.record).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'live-client',
        subscriptionId: 'live-subscription',
        classes: 1,
        reason: 'campaign',
        authorAccountId: 'administrator-account',
        campaignName: 'Inicio de año',
      }),
    );
  });

  it.each(['assistant', 'trainer', 'nutritionist'] as const)(
    'refuses a %s and writes nothing',
    async (role) => {
      const deps = dependencies(staff(role), []);

      await expect(
        grantCampaign(
          { name: 'Vacaciones', classes: 1, idempotencyKey: 'key' },
          deps,
        ),
      ).rejects.toMatchObject({ code: 'administration_access_denied' });
      await expect(
        grantCampaign(
          { name: 'Vacaciones', classes: 1, idempotencyKey: 'key' },
          deps,
        ),
      ).rejects.toBeInstanceOf(AdministrationError);
      expect(deps.record).not.toHaveBeenCalled();
      expect(deps.findRecipients).not.toHaveBeenCalled();
    },
  );

  it('refuses a coordinator, a role this branch does not have', async () => {
    const deps = dependencies(coordinator, []);

    await expect(
      grantCampaign(
        { name: 'Vacaciones', classes: 1, idempotencyKey: 'key' },
        deps,
      ),
    ).rejects.toMatchObject({ code: 'administration_access_denied' });
    expect(deps.record).not.toHaveBeenCalled();
  });

  it('grants classes only, never a price or a discount', async () => {
    const deps = dependencies(staff('administrator'), [
      {
        clientId: 'live-client',
        name: 'Lucía',
        subscriptionId: 'live-subscription',
      },
    ]);

    const result = await grantCampaign(
      { name: 'Inicio de año', classes: 1, idempotencyKey: 'key' },
      deps,
    );

    expect(result).not.toHaveProperty('discountCentavos');
    expect(result).not.toHaveProperty('priceCentavos');
    expect(deps.record).toHaveBeenCalledWith(
      expect.not.objectContaining({
        discountCentavos: expect.anything(),
        priceCentavos: expect.anything(),
      }),
    );
  });

  it('refuses a class count outside 1 to 4', async () => {
    const deps = dependencies(staff('administrator'), []);

    await expect(
      grantCampaign(
        { name: 'Inicio de año', classes: 0, idempotencyKey: 'key' },
        deps,
      ),
    ).rejects.toMatchObject({ code: 'invalid_campaign' });
    await expect(
      grantCampaign(
        { name: 'Inicio de año', classes: 5, idempotencyKey: 'key' },
        deps,
      ),
    ).rejects.toMatchObject({ code: 'invalid_campaign' });
    expect(deps.record).not.toHaveBeenCalled();
  });
});
