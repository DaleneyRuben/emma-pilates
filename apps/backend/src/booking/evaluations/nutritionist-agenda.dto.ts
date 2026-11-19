import { ApiProperty } from '@nestjs/swagger';
import { ClientPhotoDto } from '../client/client-discovery.dto';

// The Nutritionist's own agenda of booked Evaluations, page by page.
export class NutritionistAgendaEntryDto {
  @ApiProperty({ format: 'uuid' })
  evaluationId!: string;

  @ApiProperty()
  clientName!: string;

  @ApiProperty({
    type: ClientPhotoDto,
    nullable: true,
    description: 'The Client photo (FIX-041), null while her initials stand in',
  })
  clientPhoto!: ClientPhotoDto | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '+591 70011001',
    description:
      'The Client phone as stored, null when she has none; the agenda opens WhatsApp to it (E5). Older builds ignore it.',
  })
  clientPhone!: string | null;

  @ApiProperty({ format: 'date-time' })
  startsAt!: Date;

  @ApiProperty({ format: 'date-time' })
  endsAt!: Date;

  @ApiProperty({ example: 45 })
  durationMinutes!: number;

  @ApiProperty({ format: 'uuid' })
  branchId!: string;

  @ApiProperty()
  branchName!: string;

  @ApiProperty({
    enum: ['first', 'follow_up'],
    description: 'first unless the Client has an earlier booked Evaluation',
  })
  kind!: 'first' | 'follow_up';

  @ApiProperty({
    description:
      'A paid Evaluation whose Payment is confirmed: cancelling it keeps the Payment and the Client picks another slot. Older builds ignore it.',
  })
  paymentConfirmed!: boolean;
}

export class NutritionistAgendaPageDto {
  @ApiProperty({ type: NutritionistAgendaEntryDto, isArray: true })
  items!: NutritionistAgendaEntryDto[];

  @ApiProperty()
  hasMore!: boolean;

  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;
}
