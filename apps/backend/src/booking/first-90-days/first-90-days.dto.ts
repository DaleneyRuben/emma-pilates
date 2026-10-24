import { ApiProperty } from '@nestjs/swagger';
import {
  contactAlertReasons,
  type ContactAlertReason,
} from './first-90-days-alerts';

export class ContactAlertItemDto {
  @ApiProperty({ format: 'uuid' })
  clientId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  phone!: string | null;

  @ApiProperty({
    format: 'date',
    description: 'Start Date of the first real Plan, Bolivia civil date',
  })
  startedOn!: string;

  @ApiProperty({ enum: contactAlertReasons, isArray: true })
  reasons!: ContactAlertReason[];
}

export class ContactAlertListDto {
  @ApiProperty({ type: ContactAlertItemDto, isArray: true })
  items!: ContactAlertItemDto[];

  @ApiProperty({ minimum: 0 })
  totalItems!: number;
}
