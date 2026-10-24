import { ApiProperty } from '@nestjs/swagger';

export class PayStatementLineDto {
  @ApiProperty({ enum: ['class', 'minimum_not_met', 'commission'] })
  kind!: 'class' | 'minimum_not_met' | 'commission';
  @ApiProperty() detail!: string;
  @ApiProperty({ description: 'BOB centavos' }) amountCentavos!: number;
}

export class PayStatementDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) staffMemberId!: string;
  @ApiProperty() staffMemberName!: string;
  @ApiProperty({ format: 'date' }) month!: string;
  @ApiProperty({ enum: ['draft', 'approved'] })
  state!: 'draft' | 'approved';
  @ApiProperty({ description: 'BOB centavos' }) totalCentavos!: number;
  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  salaryPaymentId!: string | null;
  @ApiProperty({ type: PayStatementLineDto, isArray: true })
  lines!: PayStatementLineDto[];
}

export class PayStatementDraftDto {
  @ApiProperty() drafted!: number;
}
