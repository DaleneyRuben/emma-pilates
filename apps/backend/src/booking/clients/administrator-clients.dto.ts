import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import { clientAccountStatuses } from '../assistant/assistant.dto';
import type { ClientAccountStatus } from '../assistant/assistant-clients';
import {
  ClientPhotoDto,
  ClientSubscriptionDto,
} from '../client/client-discovery.dto';
import type {
  ClientDirectoryFilter,
  ClientDirectoryQuery,
  DirectorySubscriptionStatus,
} from './administrator-clients';

export const directorySubscriptionStatuses = [
  'active',
  'expired',
  'none',
] as const satisfies readonly DirectorySubscriptionStatus[];

export const clientDirectoryFilters = [
  'all',
  ...directorySubscriptionStatuses,
  'founder',
] as const satisfies readonly (ClientDirectoryFilter | 'all')[];

export class AdminClientDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({
    type: ClientPhotoDto,
    nullable: true,
    description: 'Her photo (FIX-041), null while her initials stand in',
  })
  photo!: ClientPhotoDto | null;

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

  @ApiProperty({
    type: Number,
    nullable: true,
    minimum: 0,
    description: 'Classes left on the active Subscription, null without one',
  })
  remainingClassAllowance!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    minimum: 0,
    description: 'Classes the active Subscription granted, null without one',
  })
  originalClassAllowance!: number | null;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    description:
      'The active Plan’s last day, or the last Plan’s when it expired; null if never',
  })
  planEndsOn!: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    minimum: 1,
    description: 'The live Fundadora place’s number, if any',
  })
  founderNumber!: number | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The Client or Trainer whose Referral Code she used',
  })
  invitedByName!: string | null;
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

  @ApiProperty({
    minimum: 0,
    description: 'Clients of the studio holding a live Fundadora place',
  })
  founderClientCount!: number;
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

  @ApiProperty({
    type: ClientPhotoDto,
    nullable: true,
    description: 'Her photo (FIX-041), null while her initials stand in',
  })
  photo!: ClientPhotoDto | null;

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

// A search and one chip (follow-up 232); unknown parameters are refused
// (ADR-0062).
export const parseClientDirectoryQuery = (value: unknown) =>
  z
    .strictObject({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      q: z.string().trim().max(100).optional(),
      filter: z.enum(clientDirectoryFilters).default('all'),
    })
    .transform(({ q, filter, ...paging }): ClientDirectoryQuery => ({
      ...paging,
      ...(q === undefined || q === '' ? {} : { query: q }),
      ...(filter === 'all' ? {} : { filter }),
    }))
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
