import { ForbiddenException } from '@nestjs/common';
import { BookingAccessDeniedError } from '../commands/create-booking';

// The Client's own routes answer a Staff Member's token with 403.
export const denyNonClients = async <T>(work: () => Promise<T>): Promise<T> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof BookingAccessDeniedError) {
      throw new ForbiddenException({
        code: 'booking_access_denied',
        detail: 'Booking access is denied',
      });
    }
    throw error;
  }
};
