import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';
import type { ImagePurpose } from './image-purpose';

const imagePurposes: [ImagePurpose, ...ImagePurpose[]] = [
  'profile_photo',
  'transfer_receipt',
  'promotion',
];

export class CreatePendingUploadDto {
  @ApiProperty({ enum: imagePurposes })
  purpose!: ImagePurpose;

  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp'] })
  mediaType!: string;

  @ApiProperty({ minimum: 1 })
  byteSize!: number;

  @ApiProperty({
    description: 'Base64-encoded SHA-256 checksum of the declared bytes',
  })
  checksum!: string;
}

export class PendingUploadDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    description: 'Where to PUT the declared bytes before finalizing',
  })
  uploadUrl!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: Date;
}

export const uploadStates = [
  'pending',
  'processing',
  'ready',
  'attached',
  'failed',
  'deleted',
] as const;

export type UploadState = (typeof uploadStates)[number];

export class UploadStatusDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: uploadStates })
  state!: UploadState;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description: 'Verified media type once the worker has processed the bytes',
  })
  mediaType!: string | null;
}

export class FinalizedUploadDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    enum: ['pending', 'processing', 'ready', 'attached', 'failed', 'deleted'],
  })
  state!: string;
}

const createPendingUploadSchema = z.object({
  purpose: z.enum(imagePurposes),
  mediaType: z.string().min(1),
  byteSize: z.number().int().positive(),
  checksum: z.string().min(1),
});
const uuidSchema = z.uuid();

export const parseCreatePendingUpload = (
  value: unknown,
): CreatePendingUploadDto | null => {
  const result = createPendingUploadSchema.safeParse(value);
  return result.success ? result.data : null;
};

export const parseUuid = (value: unknown): string | null => {
  const result = uuidSchema.safeParse(value);
  return result.success ? result.data : null;
};
