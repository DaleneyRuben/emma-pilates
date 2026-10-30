import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BudgetLineResultDto {
  @ApiProperty() name!: string;
  @ApiProperty({ description: 'BOB centavos' }) budgetCentavos!: number;
  @ApiProperty({ description: 'BOB centavos' }) actualCentavos!: number;
}

export class MonthResultDto {
  @ApiProperty({ format: 'date', description: 'First day of the month' })
  month!: string;
  @ApiProperty({ description: 'Confirmed Payments, BOB centavos' })
  cashIncomeCentavos!: number;
  @ApiProperty({ description: 'Percent of cash income' })
  taxRatePercent!: number;
  @ApiProperty({ description: 'BOB centavos' }) taxCentavos!: number;
  @ApiProperty({ description: 'BOB centavos' })
  budgetSubtotalCentavos!: number;
  @ApiProperty({ description: 'Percent of the budget subtotal' })
  contingencyPercent!: number;
  @ApiProperty({ description: 'BOB centavos' }) contingencyCentavos!: number;
  @ApiProperty({ description: 'BOB centavos' }) budgetTotalCentavos!: number;
  @ApiProperty({ type: BudgetLineResultDto, isArray: true })
  lines!: BudgetLineResultDto[];
  @ApiProperty({ description: 'BOB centavos owed to the Nutritionist' })
  nutritionistCostCentavos!: number;
  @ApiPropertyOptional({
    description:
      'The month’s Salary Payments, BOB centavos. The Coordinator’s and reception’s also show as the actual of their budget lines',
  })
  salariesCentavos?: number;
  @ApiProperty({
    description:
      'Cash income less tax, actual costs, salaries, and the Nutritionist',
  })
  resultCentavos!: number;
  @ApiProperty({
    description: 'Cash income that covers the budget and the Nutritionist',
  })
  breakEvenCentavos!: number;
}

export class OpeningBudgetSeedDto {
  @ApiProperty() seeded!: boolean;
}
