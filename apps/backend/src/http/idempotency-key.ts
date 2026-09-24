import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

// ADR-0060: the `Idempotency-Key` header every retry-sensitive command
// declares (its OpenAPI shape) and requires (its parsing).
export const idempotencyHeader = {
  name: 'idempotency-key',
  required: true,
  schema: { format: 'uuid' },
} as const;

const uuid = z.uuid();

export const requireIdempotencyKey = (value: string | undefined): string => {
  const result = uuid.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({
      code: 'invalid_request',
      detail: 'Idempotency-Key must be a UUID',
    });
  }
  return result.data;
};
