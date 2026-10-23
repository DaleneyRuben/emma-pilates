import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { BookingAccessDeniedError } from '../commands/create-booking';
import {
  BranchCatalogController,
  ClassTypeCatalogController,
  ClientProfileController,
  PlanCatalogController,
  SessionDetailController,
} from './client-discovery.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};
const sessionId = '11111111-1111-4111-8111-111111111111';

describe('ClientProfileController', () => {
  const resolvePrincipal = jest.fn();
  const loadProfile = jest.fn();
  const loadSubscription = jest.fn();
  const updateProfile = jest.fn();
  const controller = new ClientProfileController(
    loadProfile,
    loadSubscription,
    updateProfile,
    resolvePrincipal,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    resolvePrincipal.mockResolvedValue(principal);
  });

  it('returns the authenticated Client profile', async () => {
    const profile = {
      id: 'client-id',
      name: 'Lucía Fernández',
      email: 'lucia@example.com',
      phone: null,
      referralCode: 'REF-LUCIA',
    };
    loadProfile.mockResolvedValue(profile);

    await expect(controller.profile(bearer)).resolves.toEqual(profile);
    expect(loadProfile).toHaveBeenCalledWith(principal);
  });

  it('serializes Subscription calendar dates as Bolivia civil dates', async () => {
    loadSubscription.mockResolvedValue({
      status: 'expiring_soon',
      subscription: {
        id: 'subscription-id',
        planName: 'Paquete de 8 clases',
        originalClassAllowance: 8,
        remainingClassAllowance: 2,
        startsOn: new Date('2026-08-25T00:00:00.000Z'),
        endsOn: new Date('2026-09-24T00:00:00.000Z'),
      },
    });

    await expect(controller.subscription(bearer)).resolves.toEqual({
      status: 'expiring_soon',
      subscription: {
        id: 'subscription-id',
        planName: 'Paquete de 8 clases',
        originalClassAllowance: 8,
        remainingClassAllowance: 2,
        startsOn: '2026-08-25',
        endsOn: '2026-09-24',
      },
    });
  });

  it('returns none without a Subscription', async () => {
    loadSubscription.mockResolvedValue({ status: 'none', subscription: null });

    await expect(controller.subscription(bearer)).resolves.toEqual({
      status: 'none',
      subscription: null,
    });
  });

  it('requires a bearer credential', async () => {
    await expect(controller.profile(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('updates the profile name and phone', async () => {
    const updated = {
      id: 'client-id',
      name: 'Lucía F.',
      email: 'lucia@example.com',
      phone: null,
      referralCode: 'REF-LUCIA',
    };
    updateProfile.mockResolvedValue(updated);

    await expect(
      controller.update(bearer, { name: 'Lucía F.', phone: null }),
    ).resolves.toEqual(updated);
    expect(updateProfile).toHaveBeenCalledWith(
      { name: 'Lucía F.', phone: null },
      principal,
    );
  });

  it('rejects an invalid profile update body', async () => {
    await expect(
      controller.update(bearer, { name: 42, phone: null }),
    ).rejects.toMatchObject({
      response: { code: 'invalid_request' },
      status: 400,
    });
    updateProfile.mockRejectedValue(new Error('Client name is required'));
    await expect(
      controller.update(bearer, { name: '   ', phone: null }),
    ).rejects.toMatchObject({
      response: { code: 'client_name_required' },
      status: 400,
    });
  });

  it('maps Client-only access to a stable problem code', async () => {
    loadProfile.mockRejectedValue(new BookingAccessDeniedError());

    await expect(controller.profile(bearer)).rejects.toMatchObject({
      response: { code: 'booking_access_denied' },
      status: 403,
    });
  });
});

describe('PlanCatalogController', () => {
  const resolvePrincipal = jest.fn().mockResolvedValue(principal);
  const listPlans = jest.fn();
  const findPlan = jest.fn();
  const controller = new PlanCatalogController(
    { list: listPlans, find: findPlan },
    resolvePrincipal,
  );
  const plan = {
    id: 'plan-id',
    name: 'Paquete de 8 clases',
    durationDays: 30,
    weeklyClassCap: null,
    classAllowance: 8,
    priceCentavos: 56_000,
    displayOrder: 0,
  };

  it('lists visible Plans without internal ordering fields', async () => {
    listPlans.mockResolvedValue([plan]);

    await expect(controller.list(bearer)).resolves.toEqual([
      {
        id: 'plan-id',
        name: 'Paquete de 8 clases',
        durationDays: 30,
        weeklyClassCap: null,
        durationMonths: 1,
        classAllowance: 8,
        priceCentavos: 56_000,
      },
    ]);
  });

  it('returns a stable not-found problem for a hidden or unknown Plan', async () => {
    findPlan.mockResolvedValue(null);

    await expect(controller.get(sessionId, bearer)).rejects.toMatchObject({
      response: { code: 'plan_not_found' },
      status: 404,
    });
    await expect(controller.get('not-a-uuid', bearer)).rejects.toMatchObject({
      response: { code: 'invalid_request' },
      status: 400,
    });
  });
});

describe('catalog list controllers', () => {
  const resolvePrincipal = jest.fn().mockResolvedValue(principal);

  it('lists Branches for any authenticated principal', async () => {
    const branches = [{ id: 'branch-id', name: 'Centro', address: 'Calle 1' }];
    const controller = new BranchCatalogController(
      jest.fn().mockResolvedValue(branches),
      resolvePrincipal,
    );

    await expect(controller.list(bearer)).resolves.toEqual(branches);
  });

  // A Class Type has no duration; released apps still read 60 (WEB-027).
  it('lists Class Types with only client-facing fields', async () => {
    const controller = new ClassTypeCatalogController(
      jest.fn().mockResolvedValue([
        {
          id: 'class-type-id',
          name: 'Mat Pilates',
          description: 'Pilates en colchoneta',
          defaultCapacity: 14,
          equipmentNeeds: null,
        },
      ]),
      resolvePrincipal,
    );

    await expect(controller.list(bearer)).resolves.toEqual([
      {
        id: 'class-type-id',
        name: 'Mat Pilates',
        description: 'Pilates en colchoneta',
        durationMinutes: 60,
      },
    ]);
  });
});

describe('SessionDetailController', () => {
  const resolvePrincipal = jest.fn().mockResolvedValue(principal);
  const findSessionDetail = jest.fn();
  const classesLeft = jest.fn().mockResolvedValue(null);
  const controller = new SessionDetailController(
    findSessionDetail,
    classesLeft,
    resolvePrincipal,
  );

  beforeEach(() => {
    resolvePrincipal.mockResolvedValue(principal);
  });

  it('returns the Session detail', async () => {
    const detail = {
      id: sessionId,
      branch: { id: 'branch-id', name: 'Centro', address: 'Calle 1' },
      classType: {
        id: 'class-type-id',
        name: 'Reformer Pilates',
        description: 'Reformer',
        durationMinutes: 50,
      },
      trainerName: 'Emma Vargas',
      startsAt: new Date('2026-09-21T11:00:00.000Z'),
      endsAt: new Date('2026-09-21T11:50:00.000Z'),
      capacity: 12,
      bookedCount: 5,
      availableSeats: 7,
      waitlistCount: 0,
    };
    findSessionDetail.mockResolvedValue(detail);

    classesLeft.mockResolvedValue(1);
    await expect(controller.get(sessionId, bearer)).resolves.toEqual({
      ...detail,
      classesLeftThisWeek: 1,
    });
    expect(findSessionDetail).toHaveBeenCalledWith(sessionId);
    expect(classesLeft).toHaveBeenCalledWith('client-id', detail.startsAt);
  });

  it('returns a stable not-found problem for cancelled or unknown Sessions', async () => {
    findSessionDetail.mockResolvedValue(null);

    await expect(controller.get(sessionId, bearer)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(controller.get(sessionId, bearer)).rejects.toMatchObject({
      response: { code: 'session_not_found' },
    });
  });
});
