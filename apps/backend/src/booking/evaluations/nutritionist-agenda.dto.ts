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
}

export class NutritionistAgendaPageDto {
  @ApiProperty({ type: NutritionistAgendaEntryDto, isArray: true })
  items!: NutritionistAgendaEntryDto[];

  @ApiProperty()
  hasMore!: boolean;

  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;
}
