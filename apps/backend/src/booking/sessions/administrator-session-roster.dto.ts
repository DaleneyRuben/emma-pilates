import { ApiProperty } from '@nestjs/swagger';
import { ClientPhotoDto } from '../client/client-discovery.dto';

export class AdministratorRosterBookingDto {
  @ApiProperty({ format: 'uuid' })
  bookingId!: string;

  @ApiProperty({ format: 'uuid' })
  clientId!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty({
    type: ClientPhotoDto,
    nullable: true,
    description: 'The Client photo (FIX-041), null while her initials stand in',
  })
  clientPhoto!: ClientPhotoDto | null;

  @ApiProperty({
    enum: ['attended', 'no_show'],
    nullable: true,
    description: 'Null until the Trainer records Attendance',
  })
  attendanceOutcome!: 'attended' | 'no_show' | null;

  @ApiProperty({
    minimum: 1,
    description:
      'Her n-th class, counting earlier held classes she did not miss: 1 is her first class (W1)',
  })
  classNumber!: number;

  @ApiProperty({
    description: 'She holds an active Founder Membership (W1 «Fundadora»)',
  })
  founder!: boolean;
}

export class AdministratorRosterWaitlistEntryDto {
  @ApiProperty({ format: 'uuid' })
  waitlistEntryId!: string;

  @ApiProperty({ format: 'uuid' })
  clientId!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty({
    type: ClientPhotoDto,
    nullable: true,
    description: 'The Client photo (FIX-041), null while her initials stand in',
  })
  clientPhoto!: ClientPhotoDto | null;

  @ApiProperty({ minimum: 1, description: 'Place in the open Waitlist' })
  position!: number;
}

export class AdministratorSessionRosterDto {
  @ApiProperty({ format: 'uuid' })
  sessionId!: string;

  @ApiProperty({ type: AdministratorRosterBookingDto, isArray: true })
  bookings!: AdministratorRosterBookingDto[];

  @ApiProperty({ type: AdministratorRosterWaitlistEntryDto, isArray: true })
  waitlist!: AdministratorRosterWaitlistEntryDto[];
}
