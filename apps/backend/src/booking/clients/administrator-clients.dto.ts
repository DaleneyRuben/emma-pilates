import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { clientAccountStatuses } from '../assistant/assistant.dto';
import type { ClientAccountStatus } from '../assistant/assistant-clients';
import { ClientSubscriptionDto } from '../client/client-discovery.dto';
import type { DirectorySubscriptionStatus } from './administrator-clients';

export const directorySubscriptionStatuses = [
  'active',
  'expired',
  'none',
] as const satisfies readonly DirectorySubscriptionStatus[];

export class AdminClientDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({ enum: clientAccountStatuses })
  accountStatus!: ClientAccountStatus;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The active Subscription’s Plan name, if any',
  })
  planName!: string | null;

  @ApiProperty({
    enum: directorySubscriptionStatuses,
    description: '`expired` when the Client had a Plan before, `none` if never',
  })
  subscriptionStatus!: DirectorySubscriptionStatus;
}

export class AdminClientPageDto {
  @ApiProperty({ type: AdminClientDto, isArray: true })
  items!: AdminClientDto[];

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  pageSize!: number;

  @ApiProperty({ minimum: 0, description: 'Clients matching the search' })
  totalItems!: number;

  @ApiProperty({
    minimum: 0,
    description: 'Every Client of the studio, whatever the search',
  })
  studioClientCount!: number;

  @ApiProperty({
    minimum: 0,
    description: 'Clients of the studio with an active Subscription today',
  })
  activePlanClientCount!: number;
}

export class AdminClientClosureOutlookDto {
  @ApiProperty({ minimum: 0, description: 'Future Bookings closure cancels' })
  futureBookingCount!: number;

  @ApiProperty({ minimum: 0, description: 'Waitlist entries closure closes' })
  activeWaitlistEntryCount!: number;

  @ApiProperty({
    minimum: 0,
    description: 'Upcoming Evaluations closure cancels',
  })
  upcomingEvaluationCount!: number;

  @ApiProperty({
    description: 'A transfer Payment awaits review, so closure is refused',
  })
  transferPaymentPending!: boolean;
}

export class AdminClientDetailDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({
    enum: clientAccountStatuses,
    description: '`pending` while an invitation or verification is open',
  })
  accountStatus!: ClientAccountStatus;

  @ApiProperty({ format: 'date', description: 'Bolivia date of creation' })
  clientSince!: string;

  @ApiProperty({ type: ClientSubscriptionDto })
  subscription!: ClientSubscriptionDto;

  @ApiProperty({
    minimum: 0,
    deprecated: true,
    description: 'Deprecated (PAY-005): Credit was retired; always 0',
  })
  creditAvailableCentavos!: number;

  @ApiProperty()
  referralCode!: string;

  @ApiProperty({ minimum: 0 })
  referredClientCount!: number;

  @ApiProperty({ type: AdminClientClosureOutlookDto })
  closure!: AdminClientClosureOutlookDto;
}

// Search is the directory's only filter; unknown parameters are refused
// (ADR-0062).
export const parseClientDirectoryQuery = (value: unknown) =>
  z
    .strictObject({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      q: z.string().trim().max(100).optional(),
    })
    .transform(({ q, ...paging }) =>
      q === undefined || q === '' ? paging : { ...paging, query: q },
    )
    .safeParse(value);

// IDN-009 (AW22 «Editar perfil»): the name and phone; the login email stays
// the Client's own (IDN-008).
export class UpdateAdminClientProfileDto {
  @ApiProperty({ minLength: 1, maxLength: 100 })
  name!: string;

  @ApiProperty({ type: String, nullable: true, maxLength: 30 })
  phone!: string | null;
}

export const parseUpdateAdminClientProfile = (value: unknown) =>
  z
    .strictObject({
      name: z.string().max(100),
      phone: z.string().max(30).nullable(),
    })
    .safeParse(value);
