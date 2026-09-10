import { UnauthorizedException } from '@nestjs/common';
import {
  BookingCancellationController,
  BookingController,
} from './booking.controller';
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
  const controller = new BookingController(
    createBooking,
    joinWaitlist,
    listAvailability,
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
});
