import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiProperty,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';

export const readinessCheck = Symbol('readinessCheck');
export const releaseIdentifier = Symbol('releaseIdentifier');

export class ReadinessResponseDto {
  @ApiProperty({ enum: ['ready'] })
  status: 'ready';

  @ApiProperty({ description: 'Release identifier of the serving build' })
  release: string;

  constructor(release: string) {
    this.status = 'ready';
    this.release = release;
  }
}

@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class ReadinessController {
  constructor(
    @Inject(readinessCheck) private readonly ready: () => Promise<boolean>,
    @Inject(releaseIdentifier) private readonly release: string,
  ) {}

  @Get('ready')
  @ApiOkResponse({ type: ReadinessResponseDto })
  @ApiServiceUnavailableResponse({ description: 'Not ready for traffic' })
  async getReadiness(): Promise<ReadinessResponseDto> {
    if (!(await this.ready())) {
      throw new ServiceUnavailableException({
        detail: 'The API is not ready to receive traffic',
        code: 'not_ready',
      });
    }
    return new ReadinessResponseDto(this.release);
  }
}
