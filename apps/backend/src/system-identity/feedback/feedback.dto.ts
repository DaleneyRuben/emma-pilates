import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';
import {
  feedbackApps,
  feedbackNoteMaxLength,
  feedbackPlatforms,
  feedbackStatuses,
  feedbackTextLength,
  feedbackTypes,
  type FeedbackApp,
  type FeedbackPlatform,
  type FeedbackRole,
  type FeedbackRow,
  type FeedbackStatus,
  type FeedbackType,
} from './feedback';

const feedbackRoles = [
  'client',
  'trainer',
  'assistant',
  'nutritionist',
  'administrator',
  'coordinator',
] as const;

export class SendFeedbackDto {
  @ApiProperty({ enum: feedbackTypes })
  type!: FeedbackType;

  @ApiProperty({
    minLength: feedbackTextLength.min,
    maxLength: feedbackTextLength.max,
    description: 'Counted after trimming',
  })
  text!: string;

  @ApiProperty({ maxLength: 40, example: '1.0.1' })
  appVersion!: string;

  @ApiProperty({ maxLength: 40, example: '3' })
  appBuild!: string;

  @ApiProperty({ enum: feedbackPlatforms })
  platform!: FeedbackPlatform;

  @ApiProperty({ maxLength: 40, example: '14' })
  osVersion!: string;
}

export class FeedbackReceiptDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class AdminFeedbackDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: feedbackApps })
  app!: FeedbackApp;

  @ApiProperty({
    enum: feedbackRoles,
    description: 'The sender’s Role when it was sent',
  })
  role!: FeedbackRole;

  @ApiProperty({ enum: feedbackTypes })
  type!: FeedbackType;

  @ApiProperty()
  text!: string;

  @ApiProperty()
  appVersion!: string;

  @ApiProperty()
  appBuild!: string;

  @ApiProperty({ enum: feedbackPlatforms })
  platform!: FeedbackPlatform;

  @ApiProperty()
  osVersion!: string;

  @ApiProperty({ enum: feedbackStatuses })
  status!: FeedbackStatus;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '«Qué cambiamos», the Administrators’ internal note',
  })
  changeNote!: string | null;

  @ApiProperty({ format: 'email', description: 'The sender’s login email' })
  senderEmail!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  triagedAt!: string | null;
}

export class AdminFeedbackPageDto {
  @ApiProperty({ type: AdminFeedbackDto, isArray: true })
  items!: AdminFeedbackDto[];

  @ApiProperty({ minimum: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100 })
  pageSize!: number;

  @ApiProperty({ minimum: 0, description: 'Feedback matching the filters' })
  totalItems!: number;

  @ApiProperty({ minimum: 0, description: 'Every Feedback still «Nuevo»' })
  newCount!: number;
}

export class AdminFeedbackExportDto {
  @ApiProperty({
    type: AdminFeedbackDto,
    isArray: true,
    description: 'Every Feedback, newest first',
  })
  items!: AdminFeedbackDto[];
}

export class TriageFeedbackDto {
  @ApiProperty({ enum: feedbackStatuses })
  status!: FeedbackStatus;

  @ApiProperty({
    type: String,
    nullable: true,
    maxLength: feedbackNoteMaxLength,
    description: '«Qué cambiamos»; blank clears it',
  })
  changeNote!: string | null;
}

const metadata = z.string().trim().min(1).max(40);

export const parseSendFeedback = (value: unknown) =>
  z
    .strictObject({
      type: z.enum(feedbackTypes),
      text: z
        .string()
        .trim()
        .min(feedbackTextLength.min)
        .max(feedbackTextLength.max),
      appVersion: metadata,
      appBuild: metadata,
      platform: z.enum(feedbackPlatforms),
      osVersion: metadata,
    })
    .safeParse(value);

// ADR-0062: only these filters; absent means every status or app.
export const parseFeedbackQuery = (value: unknown) =>
  z
    .strictObject({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
      status: z.enum(feedbackStatuses).optional(),
      app: z.enum(feedbackApps).optional(),
    })
    .transform(({ status, app, ...paging }) => ({
      ...paging,
      ...(status === undefined ? {} : { status }),
      ...(app === undefined ? {} : { app }),
    }))
    .safeParse(value);

export const parseTriageFeedback = (value: unknown) =>
  z
    .strictObject({
      status: z.enum(feedbackStatuses),
      changeNote: z.string().max(feedbackNoteMaxLength).nullable(),
    })
    .safeParse(value);

export const toAdminFeedbackDto = (row: FeedbackRow): AdminFeedbackDto => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  triagedAt: row.triagedAt?.toISOString() ?? null,
});
