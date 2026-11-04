import { ApiProperty } from '@nestjs/swagger';

// GET and PUT /administrator/transfer-qr (WEB-038).
export class StudioTransferQrDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'When the Administrator last uploaded the QR, or null while the server file is still served',
  })
  updatedAt!: string | null;
}
