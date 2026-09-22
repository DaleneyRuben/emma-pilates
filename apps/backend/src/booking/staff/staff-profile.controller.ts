import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Inject,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { authenticatedPrincipalResolver } from '../../system-identity/authentication/authentication.controller';
import {
  authenticateBearer,
  type PrincipalResolver,
} from '../../system-identity/authentication/bearer-principal';
import type { AuthenticatedPrincipal } from '../../system-identity/authentication/resolve-authenticated-principal';
import { BookingAccessDeniedError } from '../commands/create-booking';
import type { StaffProfile } from './staff-profile';
import { StaffProfileDto } from './staff-profile.dto';

export const staffProfile = Symbol('staffProfile');

type StaffProfileHandler = (
  principal: AuthenticatedPrincipal,
) => Promise<StaffProfile>;

@Controller({ path: 'staff-members/current', version: '1' })
@ApiBearerAuth()
export class StaffProfileController {
  constructor(
    @Inject(staffProfile) private readonly loadProfile: StaffProfileHandler,
    @Inject(authenticatedPrincipalResolver)
    private readonly principalResolver: PrincipalResolver,
  ) {}

  @Get()
  @ApiOperation({ operationId: 'getCurrentStaffMemberProfile' })
  @ApiOkResponse({ type: StaffProfileDto })
  async profile(
    @Headers('authorization') authorization: string | undefined,
  ): Promise<StaffProfileDto> {
    const principal = await authenticateBearer(
      this.principalResolver,
      authorization,
    );

    try {
      return await this.loadProfile(principal);
    } catch (error) {
      if (error instanceof BookingAccessDeniedError) {
        throw new ForbiddenException({
          code: 'booking_access_denied',
          detail: 'Booking access is denied',
        });
      }
      throw error;
    }
  }
}
