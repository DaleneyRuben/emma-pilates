import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { voidSale } from './void-sale';

const staff = (
  role:
    'assistant' | 'administrator' | 'trainer' | 'nutritionist' | 'coordinator',
): AuthenticatedPrincipal =>
  ({
    accountId: `${role}-account`,
    authenticationSessionId: 'session',
    identity: {
      kind: 'staff',
      staffMemberId: `${role}-staff`,
      role,
      branchIds: role === 'administrator' ? [] : ['branch'],
    },
  }) as AuthenticatedPrincipal;

const dependencies = (principal: AuthenticatedPrincipal) => ({
  principal,
  now: new Date('2026-10-23T15:00:00.000Z'),
  voidPayment: jest.fn().mockResolvedValue({
    paymentId: 'payment-id',
    state: 'voided' as const,
    voidReason: 'Registrada dos veces',
    cancelledBookings: 1,
  }),
});

describe('voidSale', () => {
  it.each(['assistant', 'trainer', 'nutritionist', 'coordinator'] as const)(
    'refuses a %s',
    async (role) => {
      const deps = dependencies(staff(role));

      await expect(
        voidSale(
          { paymentId: 'payment-id', reason: 'Registrada dos veces' },
          deps,
        ),
      ).rejects.toMatchObject({ code: 'administration_access_denied' });
      expect(deps.voidPayment).not.toHaveBeenCalled();
    },
  );

  it('refuses a void without a reason before touching the Payment', async () => {
    const deps = dependencies(staff('administrator'));

    await expect(
      voidSale({ paymentId: 'payment-id', reason: '   ' }, deps),
    ).rejects.toMatchObject({ code: 'void_reason_required' });
    expect(deps.voidPayment).not.toHaveBeenCalled();
  });

  it('lets an Administrator void a sale with the reason she wrote', async () => {
    const deps = dependencies(staff('administrator'));

    await expect(
      voidSale(
        { paymentId: 'payment-id', reason: '  Registrada dos veces  ' },
        deps,
      ),
    ).resolves.toMatchObject({ state: 'voided' });
    expect(deps.voidPayment).toHaveBeenCalledWith({
      paymentId: 'payment-id',
      reason: 'Registrada dos veces',
      actorAccountId: 'administrator-account',
      now: deps.now,
    });
  });
});
