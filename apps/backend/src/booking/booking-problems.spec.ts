import {
  BookingRescheduleController,
  ClassHistoryController,
} from './booking.controller';
import { TrainerAttendanceController } from './trainer.controller';
import { BookingAccessDeniedError } from './commands/create-booking';

// BE-024: a rule a Client or Staff Member can break answers a stable problem
// code, never 500 (which also reports a false crash).
const bearer = 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const bookingId = '11111111-1111-4111-8111-111111111111';
const sessionId = '22222222-2222-4222-8222-222222222222';
const principal = {
  accountId: 'account-id',
  authenticationSessionId: 'authentication-session-id',
  identity: { kind: 'client' as const, clientId: 'client-id' },
};
const resolvePrincipal = jest.fn().mockResolvedValue(principal);

describe('Reschedule problems', () => {
  it.each([
    ['Booking is outside the Cancellation Window', 'reschedule_outside_window'],
    [
      'Target Session is not eligible for Reschedule',
      'reschedule_target_ineligible',
    ],
    ['Booking is not reschedulable', 'booking_not_reschedulable'],
  ])('answers 409 for «%s»', async (message, code) => {
    const controller = new BookingRescheduleController(
      jest.fn().mockRejectedValue(new Error(message)),
      resolvePrincipal,
    );

    await expect(
      controller.reschedule(bookingId, bearer, { targetSessionId: sessionId }),
    ).rejects.toMatchObject({ response: { code }, status: 409 });
  });
});

describe('Attendance problems', () => {
  const record = (failure: Error) =>
    new TrainerAttendanceController(
      jest.fn().mockRejectedValue(failure),
      resolvePrincipal,
    ).record(sessionId, bearer, {
      outcomes: [{ bookingId, outcome: 'attended' }],
    });

  it('answers 403 for another Trainer or a Session not yet ended', async () => {
    await expect(record(new BookingAccessDeniedError())).rejects.toMatchObject({
      response: { code: 'booking_access_denied' },
      status: 403,
    });
  });

  it('answers 409 when the roster changed since it was read', async () => {
    await expect(
      record(new Error('Attendance roster is incomplete')),
    ).rejects.toMatchObject({
      response: { code: 'attendance_roster_incomplete' },
      status: 409,
    });
  });
});

describe('Class history problems', () => {
  it('answers 403 for a Staff Member', async () => {
    const controller = new ClassHistoryController(
      jest.fn().mockRejectedValue(new BookingAccessDeniedError()),
      resolvePrincipal,
    );

    await expect(controller.list(bearer)).rejects.toMatchObject({
      response: { code: 'booking_access_denied' },
      status: 403,
    });
  });
});
