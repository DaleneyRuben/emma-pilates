import { UnauthorizedException } from '@nestjs/common';
import { BookingAccessDeniedError } from '../commands/create-booking';
import {
  ClientBookingsController,
  WaitlistEntriesController,
} from './client-bookings.controller';

const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};
const entryId = '11111111-1111-4111-8111-111111111111';

describe('ClientBookingsController', () => {
  const resolvePrincipal = jest.fn().mockResolvedValue(principal);
  const listUpcoming = jest.fn();
  const controller = new ClientBookingsController(
    listUpcoming,
    resolvePrincipal,
  );

  it('lists the upcoming Bookings and Waitlist Entries', async () => {
    const upcoming = [
      {
        kind: 'booking',
        bookingId: 'booking-1',
        sessionId: 'session-1',
        classTypeName: 'Reformer Pilates',
        trainerName: 'Emma Vargas',
        branchName: 'Centro',
        startsAt: new Date('2026-09-21T15:00:00.000Z'),
        endsAt: new Date('2026-09-21T15:50:00.000Z'),
      },
    ];
    listUpcoming.mockResolvedValue(upcoming);

    await expect(controller.list(bearer)).resolves.toEqual(upcoming);
    expect(listUpcoming).toHaveBeenCalledWith(principal);
  });

  it('requires a bearer credential', async () => {
    await expect(controller.list(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe('WaitlistEntriesController', () => {
  const resolvePrincipal = jest.fn().mockResolvedValue(principal);
  const leave = jest.fn();
  const controller = new WaitlistEntriesController(leave, resolvePrincipal);

  it('leaves the Waitlist Entry for the authenticated Client', async () => {
    leave.mockResolvedValue(undefined);

    await expect(controller.leave(entryId, bearer)).resolves.toBeUndefined();
    expect(leave).toHaveBeenCalledWith({ waitlistEntryId: entryId }, principal);
  });

  it('maps access denial and inactive entries to stable problems', async () => {
    leave.mockRejectedValueOnce(new BookingAccessDeniedError());
    await expect(controller.leave(entryId, bearer)).rejects.toMatchObject({
      response: { code: 'booking_access_denied' },
      status: 403,
    });

    leave.mockRejectedValueOnce(new Error('Waitlist Entry is not active'));
    await expect(controller.leave(entryId, bearer)).rejects.toMatchObject({
      response: { code: 'waitlist_entry_not_active' },
      status: 409,
    });

    await expect(controller.leave('nope', bearer)).rejects.toMatchObject({
      response: { code: 'invalid_request' },
      status: 400,
    });
  });
});
