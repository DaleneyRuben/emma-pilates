import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { BookingAccessDeniedError } from './commands/create-booking';

// The booking commands signal a broken rule with an Error whose message names
// it; each becomes a stable problem code (409), and access denial a 403
// (BE-024: none of them may surface as 500).
export const commandProblem = (error: Error): HttpException | null => {
  if (error instanceof BookingAccessDeniedError) {
    return new ForbiddenException({
      code: 'booking_access_denied',
      detail: 'Booking access is denied',
    });
  }

  const problems: Record<string, [string, string]> = {
    'Session is full': ['session_full', 'Session is full'],
    guest_pass_already_used: [
      'guest_pass_already_used',
      'A Guest Pass is once in a lifetime',
    ],
    guest_pass_last_place: [
      'guest_pass_last_place',
      'A Guest Pass cannot take the last place',
    ],
    'No eligible Subscription': [
      'no_eligible_subscription',
      'No eligible Subscription',
    ],
    'Weekly cap reached': [
      'weekly_cap_reached',
      'Ya usaste tus clases de esta semana.',
    ],
    'Client already has an overlapping Booking': [
      'booking_overlap',
      'Client already has an overlapping Booking',
    ],
    'Session has capacity': ['session_has_capacity', 'Session has capacity'],
    'Client already has a Booking': [
      'active_booking_exists',
      'Client already has a Booking',
    ],
    'Client already has an active Waitlist Entry': [
      'active_waitlist_entry_exists',
      'Client already has an active Waitlist Entry',
    ],
    'Idempotency Key was reused with a different request': [
      'idempotency_key_reused',
      'Idempotency Key was reused with a different request',
    ],
    'Booking is inside the Cancellation Window': [
      'booking_cancellation_window',
      'Booking is inside the Cancellation Window',
    ],
    'Booking is not cancellable': [
      'booking_not_cancellable',
      'Booking is not cancellable',
    ],
    'Booking is outside the Cancellation Window': [
      'reschedule_outside_window',
      'Booking is outside the Cancellation Window',
    ],
    'Target Session is not eligible for Reschedule': [
      'reschedule_target_ineligible',
      'Target Session is not eligible for Reschedule',
    ],
    'Booking is not reschedulable': [
      'booking_not_reschedulable',
      'Booking is not reschedulable',
    ],
    'Attendance roster is incomplete': [
      'attendance_roster_incomplete',
      'Attendance roster is incomplete',
    ],
  };
  const duringFreeze =
    /^Booking is during a Freeze until (\d{4}-\d{2}-\d{2})$/.exec(
      error.message,
    );
  if (duringFreeze !== null) {
    return new HttpException(
      {
        code: 'booking_during_freeze',
        detail: `Booking is during a Freeze until ${duringFreeze[1]}`,
      },
      HttpStatus.CONFLICT,
    );
  }
  const beforeStart =
    /^Booking is before the Start Date: (\d{4}-\d{2}-\d{2})$/.exec(
      error.message,
    );
  if (beforeStart !== null) {
    return new HttpException(
      {
        code: 'booking_before_start_date',
        detail: `Booking is before the Start Date: ${beforeStart[1]}`,
      },
      HttpStatus.CONFLICT,
    );
  }
  const problem = problems[error.message];

  return problem === undefined
    ? null
    : new HttpException(
        { code: problem[0], detail: problem[1] },
        HttpStatus.CONFLICT,
      );
};
