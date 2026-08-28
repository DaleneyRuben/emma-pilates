import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { LivenessResponseDto } from './liveness-response.dto';

@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  @Get('live')
  @ApiOkResponse({ type: LivenessResponseDto })
  getLiveness(): LivenessResponseDto {
    return new LivenessResponseDto();
  }
}
