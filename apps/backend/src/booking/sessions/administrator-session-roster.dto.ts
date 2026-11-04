import { ApiProperty } from '@nestjs/swagger';

export class AdministratorRosterBookingDto {
  @ApiProperty({ format: 'uuid' })
  bookingId!: string;

  @ApiProperty({ format: 'uuid' })
  clientId!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty({
    enum: ['attended', 'no_show'],
    nullable: true,
    description: 'Null until the Trainer records Attendance',
  })
  attendanceOutcome!: 'attended' | 'no_show' | null;
}

export class AdministratorRosterWaitlistEntryDto {
  @ApiProperty({ format: 'uuid' })
  waitlistEntryId!: string;

  @ApiProperty({ format: 'uuid' })
  clientId!: string;

  @ApiProperty()
  clientName!: string;

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
