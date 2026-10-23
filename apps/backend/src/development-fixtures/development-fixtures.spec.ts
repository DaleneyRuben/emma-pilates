import {
  buildDevelopmentFixtures,
  type DevelopmentFixtures,
} from './development-fixtures';

const today = new Date('2026-09-21T00:00:00.000Z');
const day = 24 * 60 * 60 * 1_000;

const clientByEmail = (fixtures: DevelopmentFixtures, email: string) => {
  const client = fixtures.clients.find(
    (candidate) => candidate.email === email,
  );
  if (!client) throw new Error(`missing client ${email}`);
  return client;
};

const subscriptionsOf = (fixtures: DevelopmentFixtures, email: string) =>
  fixtures.subscriptions.filter(
    (subscription) =>
      subscription.clientId === clientByEmail(fixtures, email).id,
  );

describe('development fixtures', () => {
  const fixtures = buildDevelopmentFixtures({ today });

  it('is deterministic for the same day', () => {
    expect(buildDevelopmentFixtures({ today })).toEqual(fixtures);
  });

  it('offers the designed Plan catalog with exact centavo prices', () => {
    expect(
      fixtures.plans.map(
        ({ name, durationMonths, classAllowance, priceCentavos }) => ({
          name,
          durationMonths,
          classAllowance,
          priceCentavos,
        }),
      ),
    ).toEqual([
      {
        name: 'Paquete de 8 clases',
        durationMonths: 1,
        classAllowance: 8,
        priceCentavos: 56_000,
      },
      {
        name: 'Paquete de 12 clases',
        durationMonths: 1,
        classAllowance: 12,
        priceCentavos: 78_000,
      },
      {
        name: 'Mensual 16 clases',
        durationMonths: 1,
        classAllowance: 16,
        priceCentavos: 105_000,
      },
      {
        name: 'Trimestral 36 clases',
        durationMonths: 3,
        classAllowance: 36,
        priceCentavos: 210_000,
      },
    ]);
  });

  it('materializes Sessions for the next 30 Bolivia days at each schedule wall-clock time', () => {
    expect(fixtures.sessions.length).toBeGreaterThan(0);

    for (const session of fixtures.sessions) {
      expect(session.startsAt.getTime()).toBeGreaterThanOrEqual(
        today.getTime(),
      );
      expect(session.startsAt.getTime()).toBeLessThan(
        today.getTime() + 30 * day,
      );
      expect(session.endsAt.getTime()).toBeGreaterThan(
        session.startsAt.getTime(),
      );
    }

    const centro = fixtures.branches.find((branch) => branch.name === 'Centro');
    const mondaySevenAm = fixtures.sessions.find(
      (session) =>
        session.branchId === centro?.id &&
        session.startsAt.toISOString() === '2026-09-21T11:00:00.000Z',
    );

    expect(mondaySevenAm).toBeDefined();
    expect(mondaySevenAm?.endsAt.toISOString()).toBe(
      '2026-09-21T11:50:00.000Z',
    );
  });

  it('links every Session to a schedule with the same Branch, Class Type, and Trainer', () => {
    for (const session of fixtures.sessions) {
      const schedule = fixtures.sessionSchedules.find(
        (candidate) => candidate.id === session.sessionScheduleId,
      );

      expect(schedule).toMatchObject({
        branchId: session.branchId,
        classTypeId: session.classTypeId,
        trainerStaffMemberId: session.trainerStaffMemberId,
        capacity: session.capacity,
      });
    }
  });

  it('never overlaps Sessions for the same Trainer or the same Branch', () => {
    const overlaps = (
      left: DevelopmentFixtures['sessions'][number],
      right: DevelopmentFixtures['sessions'][number],
    ) =>
      left.id !== right.id &&
      left.startsAt < right.endsAt &&
      right.startsAt < left.endsAt;

    for (const session of fixtures.sessions) {
      const conflicting = fixtures.sessions.filter(
        (other) =>
          overlaps(session, other) &&
          (other.trainerStaffMemberId === session.trainerStaffMemberId ||
            other.branchId === session.branchId),
      );

      expect(conflicting).toEqual([]);
    }
  });

  it('gives each Client a representative Subscription state', () => {
    expect(subscriptionsOf(fixtures, 'lucia@example.com')).toMatchObject([
      {
        state: 'active',
        remainingClassAllowance: 5,
        originalClassAllowance: 8,
        endsOn: new Date(today.getTime() + 20 * day),
      },
    ]);
    expect(subscriptionsOf(fixtures, 'valeria@example.com')).toMatchObject([
      {
        state: 'active',
        remainingClassAllowance: 2,
        endsOn: new Date(today.getTime() + 3 * day),
      },
    ]);
    expect(subscriptionsOf(fixtures, 'isabel@example.com')).toMatchObject([
      { state: 'active', remainingClassAllowance: 0 },
    ]);
    const [expired] = subscriptionsOf(fixtures, 'sofia@example.com');
    expect(expired).toMatchObject({ state: 'expired' });
    expect(expired.expiredAt).toBeInstanceOf(Date);
    expect(subscriptionsOf(fixtures, 'mariana@example.com')).toEqual([]);
  });

  it('keeps Subscription dates inside their Plan snapshot', () => {
    for (const subscription of fixtures.subscriptions) {
      const plan = fixtures.plans.find(
        (candidate) => candidate.id === subscription.planId,
      );

      expect(plan?.name).toBe(subscription.planNameSnapshot);
      expect(subscription.remainingClassAllowance).toBeLessThanOrEqual(
        subscription.originalClassAllowance,
      );
      expect(subscription.endsOn.getTime()).toBeGreaterThan(
        subscription.startsOn.getTime(),
      );
    }
  });

  it('provides one Staff Member per Role plus the designed Trainers', () => {
    const roles = fixtures.staffMembers.map((member) => member.role);

    expect(roles.filter((role) => role === 'trainer')).toHaveLength(3);
    expect(roles).toContain('assistant');
    expect(roles).toContain('administrator');
    expect(roles).toContain('nutritionist');
    // IDN-009: Carolina Rivas, the Coordinator, holds every Branch implicitly.
    expect(
      fixtures.staffMembers.find((member) => member.role === 'coordinator'),
    ).toMatchObject({
      name: 'Carolina Rivas',
      email: 'carolina.rivas@example.com',
      branchIds: [],
    });

    for (const schedule of fixtures.sessionSchedules) {
      expect(
        fixtures.staffMembers.find(
          (member) => member.id === schedule.trainerStaffMemberId,
        )?.role,
      ).toBe('trainer');
    }
  });

  it("publishes Gabriela's weekly Availability Blocks at Centro from today", () => {
    const gabriela = fixtures.staffMembers.find(
      (member) => member.email === 'gabriela.flores@example.com',
    );
    const centro = fixtures.branches.find((branch) => branch.name === 'Centro');

    expect(fixtures.availabilityBlocks).toEqual([
      expect.objectContaining({
        weekday: 1,
        startsAtLocal: '09:00',
        endsAtLocal: '13:00',
      }),
      expect.objectContaining({
        weekday: 4,
        startsAtLocal: '15:00',
        endsAtLocal: '18:00',
      }),
      expect.objectContaining({
        weekday: 6,
        startsAtLocal: '09:00',
        endsAtLocal: '12:00',
      }),
    ]);
    for (const block of fixtures.availabilityBlocks) {
      expect(block).toMatchObject({
        nutritionistStaffMemberId: gabriela?.id,
        branchId: centro?.id,
        effectiveFrom: today,
      });
    }
  });

  it("backs Valeria's Subscription with a confirmed cash Payment", () => {
    const valeria = clientByEmail(fixtures, 'valeria@example.com');
    const [subscription] = subscriptionsOf(fixtures, 'valeria@example.com');
    const payment = fixtures.payments.find(
      (candidate) => candidate.id === subscription.paymentId,
    );

    expect(payment).toMatchObject({
      clientId: valeria.id,
      planId: subscription.planId,
      planNameSnapshot: 'Paquete de 12 clases',
      method: 'cash',
      state: 'confirmed',
      planPriceCentavos: 78_000,
      creditAppliedCentavos: 0,
      amountDueCentavos: 78_000,
    });
    expect(payment?.collectedAtBranchId).toBe(
      fixtures.branches.find((branch) => branch.name === 'Centro')?.id,
    );
    expect(payment?.decidedByAccountId).toBe(payment?.submittedByAccountId);
    expect(payment?.decidedAt.getTime()).toBeGreaterThanOrEqual(
      payment?.submittedAt.getTime() ?? Number.POSITIVE_INFINITY,
    );
    expect(payment?.decidedAt).toEqual(subscription.activatedAt);
    expect(
      fixtures.subscriptions.filter((candidate) => candidate.paymentId),
    ).toHaveLength(1);
  });

  it('gives Sofía an awarded and a pending referral worth Bs 60 of credit', () => {
    const sofia = clientByEmail(fixtures, 'sofia@example.com');
    const valeria = clientByEmail(fixtures, 'valeria@example.com');
    const mariana = clientByEmail(fixtures, 'mariana@example.com');
    const referrals = fixtures.referrals.filter(
      (referral) => referral.referrerClientId === sofia.id,
    );

    expect(referrals).toMatchObject([
      { referredClientId: valeria.id, state: 'awarded', awardCentavos: 6_000 },
      {
        referredClientId: mariana.id,
        state: 'pending',
        qualifiedPaymentId: null,
        qualifiedAt: null,
        awardCentavos: null,
        awardedAt: null,
      },
    ]);
    expect(fixtures.referrals).toHaveLength(2);

    const [awarded, pending] = referrals;
    const payment = fixtures.payments.find(
      (candidate) => candidate.id === awarded.qualifiedPaymentId,
    );
    expect(payment?.clientId).toBe(valeria.id);
    expect(awarded.qualifiedAt).toEqual(payment?.decidedAt);
    expect(awarded.awardedAt).toEqual(payment?.decidedAt);
    expect(awarded.createdAt.getTime()).toBeLessThan(
      awarded.qualifiedAt?.getTime() ?? 0,
    );
    expect(pending.createdAt.getTime()).toBeLessThan(today.getTime());

    expect(fixtures.creditLedgerEntries).toEqual([
      expect.objectContaining({
        clientId: sofia.id,
        kind: 'referral_award',
        amountCentavos: 6_000,
        referralId: awarded.id,
        occurredAt: awarded.awardedAt,
        actorAccountId: payment?.decidedByAccountId,
      }),
    ]);
  });

  it('uses unique emails and referral codes', () => {
    const emails = [
      ...fixtures.staffMembers.map((member) => member.email),
      ...fixtures.clients.map((client) => client.email),
    ];
    const referralCodes = fixtures.clients.map((client) => client.referralCode);

    expect(new Set(emails).size).toBe(emails.length);
    expect(new Set(referralCodes).size).toBe(referralCodes.length);
  });
});
