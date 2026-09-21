import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Param,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { parseUuid } from '../booking.dto';
import { BookingAccessDeniedError } from '../commands/create-booking';
import type { UpcomingClientBooking } from './client-bookings';

export const clientBookings = Symbol('clientBookings');
export const leaveWaitlistCommand = Symbol('leaveWaitlistCommand');

type ClientBookingsHandler = (
  principal: AuthenticatedPrincipal,
) => Promise<UpcomingClientBooking[]>;
type LeaveWaitlistHandler = (
  command: { waitlistEntryId: string },
  principal: AuthenticatedPrincipal,
) => Promise<void>;

export class UpcomingBookingDto {
  @ApiProperty({ enum: ['booking', 'waitlist'] })
  kind!: 'booking' | 'waitlist';

  @ApiPropertyOptional({ format: 'uuid' })
  bookingId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  waitlistEntryId?: string;

  @ApiProperty({ format: 'uuid' })
  sessionId!: string;

  @ApiProperty()
  classTypeName!: string;

  @ApiProperty()
  trainerName!: string;

  @ApiProperty()
  branchName!: string;

  @ApiProperty({ format: 'date-time' })
  startsAt!: Date;

  @ApiProperty({ format: 'date-time' })
  endsAt!: Date;
}

const denyNonClients = async <T>(work: () => Promise<T>): Promise<T> => {
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

@Controller({ path: 'bookings', version: '1' })
@ApiBearerAuth()
export class ClientBookingsController {
  constructor(
    @Inject(clientBookings)
    private readonly listUpcoming: ClientBookingsHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'listUpcomingBookings' })
  @ApiOkResponse({ type: UpcomingBookingDto, isArray: true })
  async list(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<UpcomingBookingDto[]> {
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );
    return denyNonClients(() => this.listUpcoming(principal));
  }
}

@Controller({ path: 'waitlist-entries', version: '1' })
@ApiBearerAuth()
export class WaitlistEntriesController {
  constructor(
    @Inject(leaveWaitlistCommand)
    private readonly leaveEntry: LeaveWaitlistHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Delete(':waitlistEntryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'leaveWaitlist' })
  @ApiParam({ name: 'waitlistEntryId', format: 'uuid' })
  @ApiNoContentResponse()
  async leave(
    @Param('waitlistEntryId') waitlistEntryId: string,
    @Headers('authorization') authorization: string | undefined,
  ): Promise<void> {
    const parsedId = parseUuid(waitlistEntryId);
    if (parsedId === null) {
      throw new BadRequestException({
        code: 'invalid_request',
        detail: 'Invalid Waitlist Entry identifier',
      });
    }
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );

    try {
      await denyNonClients(() =>
        this.leaveEntry({ waitlistEntryId: parsedId }, principal),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Waitlist Entry is not active'
      ) {
        throw new HttpException(
          {
            code: 'waitlist_entry_not_active',
            detail: 'Waitlist Entry is not active',
          },
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }
}
