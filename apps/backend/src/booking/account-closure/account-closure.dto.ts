import { ApiProperty } from '@nestjs/swagger';
import { z } from 'zod';

export class CloseAccountRequestDto {
  @ApiProperty({ format: 'password', minLength: 1, writeOnly: true })
  password!: string;
}

export class AccountClosureSummaryDto {
  @ApiProperty({ type: Number, minimum: 0 })
  closedWaitlistEntries!: number;

  @ApiProperty({ type: Number, minimum: 0 })
  cancelledBookings!: number;

  @ApiProperty({ type: Number, minimum: 0 })
  cancelledEvaluations!: number;

  @ApiProperty({
    type: Number,
    minimum: 0,
    description:
      'Classes left on the ended Subscription, forfeited without refund',
  })
  forfeitedClasses!: number;

  @ApiProperty({
    type: Number,
    minimum: 0,
    description: 'Credit forfeited through the account_closure ledger entry',
  })
  forfeitedCreditCentavos!: number;
}

const closeAccountSchema = z.strictObject({ password: z.string().min(1) });

export const parseCloseAccountRequest = (value: unknown) =>
  closeAccountSchema.safeParse(value);
