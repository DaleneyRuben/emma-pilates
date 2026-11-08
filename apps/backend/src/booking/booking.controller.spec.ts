import { UnauthorizedException } from '@nestjs/common';
import {
  BookingCancellationController,
  BookingController,
  ClassHistoryController,
  BookingRescheduleController,
} from './booking.controller';
import {
  TrainerAttendanceController,
  TrainerScheduleController,
  TrainerSessionRosterController,
} from './trainer.controller';
import { BookingAccessDeniedError } from './commands/create-booking';

const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};

describe('BookingController', () => {
  const resolvePrincipal = jest.fn();
  const createBooking = jest.fn();
  const joinWaitlist = jest.fn();
  const listAvailability = jest.fn();
  const classesLeft = jest.fn().mockResolvedValue(null);
  const controller = new BookingController(
    createBooking,
    joinWaitlist,
    listAvailability,
    classesLeft,
    resolvePrincipal,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    resolvePrincipal.mockResolvedValue(principal);
  });

  it('creates an authenticated booking with its idempotency key', async () => {
    createBooking.mockResolvedValue({ id: 'booking-id' });

    await expect(
      controller.create(
        '11111111-1111-4111-8111-111111111111',
        'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        '22222222-2222-4222-8222-222222222222',
        {},
      ),
    ).resolves.toEqual({ id: 'booking-id' });

    expect(createBooking).toHaveBeenCalledWith(
      { sessionId: '11111111-1111-4111-8111-111111111111' },
      principal,
      '22222222-2222-4222-8222-222222222222',
    );
  });

  it('attaches the classes left this week for a Client', async () => {
    classesLeft.mockResolvedValue(2);
    listAvailability.mockResolvedValue([
      {
        id: 'session-id',
        startsAt: new Date('2026-09-15T15:00:00.000Z'),
      },
    ]);

    await expect(
      controller.list('Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', {
        branchId: '11111111-1111-4111-8111-111111111111',
        from: '2026-09-15T14:00:00.000Z',
        until: '2026-09-16T14:00:00.000Z',
      }),
    ).resolves.toEqual([
      {
        id: 'session-id',
        startsAt: new Date('2026-09-15T15:00:00.000Z'),
        classesLeftThisWeek: 2,
      },
    ]);
    expect(classesLeft).toHaveBeenCalledWith(
      'client-id',
      new Date('2026-09-15T14:00:00.000Z'),
    );
  });

  it('lists cancelled classes for Staff who ask, never for a Client (FIX-052)', async () => {
    listAvailability.mockResolvedValue([]);
    const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const query = {
      branchId: '11111111-1111-4111-8111-111111111111',
      from: '2026-09-15T14:00:00.000Z',
      until: '2026-09-16T14:00:00.000Z',
    };
    resolvePrincipal.mockResolvedValue({
      ...principal,
      identity: {
        kind: 'staff',
        staffMemberId: 'staff-id',
        role: 'assistant',
        branchIds: [query.branchId],
      },
    });

    await controller.list(bearer, { ...query, includeCancelled: 'true' });
    expect(listAvailability).toHaveBeenLastCalledWith(
      expect.objectContaining({ includeCancelled: true }),
    );
    await controller.list(bearer, query);
    expect(listAvailability).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ includeCancelled: true }),
    );

    resolvePrincipal.mockResolvedValue(principal);
    await controller.list(bearer, { ...query, includeCancelled: 'true' });
    expect(listAvailability).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ includeCancelled: true }),
    );
  });

  it('requires a bearer credential for availability', async () => {
    await expect(
      controller.list(undefined, {
        branchId: 'branch-id',
        from: '2026-09-10T00:00:00.000Z',
        until: '2026-09-11T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns a stable problem code for booking authorization', async () => {
    createBooking.mockRejectedValue(new BookingAccessDeniedError());

    await expect(
      controller.create(
        '11111111-1111-4111-8111-111111111111',
        'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        '22222222-2222-4222-8222-222222222222',
        {},
      ),
    ).rejects.toMatchObject({
      response: { code: 'booking_access_denied' },
      status: 403,
    });
  });

  it('cancels an authenticated Booking without an idempotency key', async () => {
    const cancelBooking = jest.fn().mockResolvedValue(undefined);
    const cancellationController = new BookingCancellationController(
      cancelBooking,
      resolvePrincipal,
    );

    await expect(
      cancellationController.cancel(
        '11111111-1111-4111-8111-111111111111',
        'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      ),
    ).resolves.toBeUndefined();

    expect(cancelBooking).toHaveBeenCalledWith(
      { bookingId: '11111111-1111-4111-8111-111111111111' },
      principal,
    );
  });

  it('returns a stable problem code when a Booking is inside the Cancellation Window', async () => {
    const cancelBooking = jest
      .fn()
      .mockRejectedValue(
        new Error('Booking is inside the Cancellation Window'),
      );
    const cancellationController = new BookingCancellationController(
      cancelBooking,
      resolvePrincipal,
    );

    await expect(
      cancellationController.cancel(
        '11111111-1111-4111-8111-111111111111',
        'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      ),
    ).rejects.toMatchObject({
      response: { code: 'booking_cancellation_window' },
      status: 409,
    });
  });

  it('reschedules an authenticated Booking without changing its allowance', async () => {
    const rescheduleBooking = jest.fn().mockResolvedValue({ id: 'booking-id' });
    const rescheduleController = new BookingRescheduleController(
      rescheduleBooking,
      resolvePrincipal,
    );

    await expect(
      rescheduleController.reschedule(
        '11111111-1111-4111-8111-111111111111',
        'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        { targetSessionId: '22222222-2222-4222-8222-222222222222' },
      ),
    ).resolves.toEqual({ id: 'booking-id' });

    expect(rescheduleBooking).toHaveBeenCalledWith(
      {
        bookingId: '11111111-1111-4111-8111-111111111111',
        targetSessionId: '22222222-2222-4222-8222-222222222222',
      },
      principal,
    );
  });

  it('returns the authenticated Client’s attended class history', async () => {
    const listClassHistory = jest
      .fn()
      .mockResolvedValue([
        { bookingId: 'booking-id', sessionId: 'session-id' },
      ]);
    const controller = new ClassHistoryController(
      listClassHistory,
      resolvePrincipal,
    );

    await expect(
      controller.list('Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
    ).resolves.toEqual([{ bookingId: 'booking-id', sessionId: 'session-id' }]);

    expect(listClassHistory).toHaveBeenCalledWith(principal);
  });

  it('records a Trainer attendance roster', async () => {
    const recordAttendance = jest.fn().mockResolvedValue(undefined);
    const controller = new TrainerAttendanceController(
      recordAttendance,
      resolvePrincipal,
    );

    await expect(
      controller.record(
        '11111111-1111-4111-8111-111111111111',
        'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        {
          outcomes: [
            {
              bookingId: '22222222-2222-4222-8222-222222222222',
              outcome: 'attended',
            },
          ],
        },
      ),
    ).resolves.toBeUndefined();
  });

  it('returns the authenticated Trainer’s schedule for a selected day', async () => {
    const listTrainerSchedule = jest.fn().mockResolvedValue([
      {
        sessionId: 'session-id',
        classTypeName: 'Reformer Pilates',
        branchName: 'Sucursal Centro',
        startsAt: new Date('2026-09-10T13:00:00.000Z'),
        endsAt: new Date('2026-09-10T14:00:00.000Z'),
        capacity: 8,
        bookedCount: 6,
      },
    ]);
    const controller = new TrainerScheduleController(
      listTrainerSchedule,
      resolvePrincipal,
    );

    await expect(
      controller.list(
        '2026-09-10',
        'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      ),
    ).resolves.toEqual([
      {
        sessionId: 'session-id',
        classTypeName: 'Reformer Pilates',
        branchName: 'Sucursal Centro',
        startsAt: new Date('2026-09-10T13:00:00.000Z'),
        endsAt: new Date('2026-09-10T14:00:00.000Z'),
        capacity: 8,
        bookedCount: 6,
      },
    ]);

    expect(listTrainerSchedule).toHaveBeenCalledWith(
      { on: new Date('2026-09-10T00:00:00.000Z'), includeCancelled: false },
      principal,
    );
  });

  it('asks for the day’s cancelled classes only when the agenda says so (FIX-042)', async () => {
    const listTrainerSchedule = jest.fn().mockResolvedValue([]);
    const controller = new TrainerScheduleController(
      listTrainerSchedule,
      resolvePrincipal,
    );
    const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

    await controller.list('2026-09-10', bearer, 'true');
    expect(listTrainerSchedule).toHaveBeenLastCalledWith(
      { on: new Date('2026-09-10T00:00:00.000Z'), includeCancelled: true },
      principal,
    );
    await controller.list('2026-09-10', bearer, 'false');
    expect(listTrainerSchedule).toHaveBeenLastCalledWith(
      { on: new Date('2026-09-10T00:00:00.000Z'), includeCancelled: false },
      principal,
    );
    await expect(
      controller.list('2026-09-10', bearer, 'yes'),
    ).rejects.toThrow();
  });

  it('returns the authenticated Trainer’s Session roster', async () => {
    const loadTrainerSessionRoster = jest.fn().mockResolvedValue({
      sessionId: 'session-id',
      classTypeName: 'Reformer Pilates',
      branchName: 'Sucursal Centro',
      startsAt: new Date('2026-09-10T13:00:00.000Z'),
      endsAt: new Date('2026-09-10T14:00:00.000Z'),
      bookings: [
        {
          bookingId: 'booking-id',
          clientName: 'Ana Pérez',
          attendanceOutcome: 'attended',
        },
      ],
    });
    const controller = new TrainerSessionRosterController(
      loadTrainerSessionRoster,
      resolvePrincipal,
    );

    await expect(
      controller.get(
        '11111111-1111-4111-8111-111111111111',
        'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      ),
    ).resolves.toEqual({
      sessionId: 'session-id',
      classTypeName: 'Reformer Pilates',
      branchName: 'Sucursal Centro',
      startsAt: new Date('2026-09-10T13:00:00.000Z'),
      endsAt: new Date('2026-09-10T14:00:00.000Z'),
      bookings: [
        {
          bookingId: 'booking-id',
          clientName: 'Ana Pérez',
          attendanceOutcome: 'attended',
        },
      ],
    });

    expect(loadTrainerSessionRoster).toHaveBeenCalledWith(
      { sessionId: '11111111-1111-4111-8111-111111111111' },
      principal,
    );
  });
});
