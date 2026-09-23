import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

const problemCodes: Readonly<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'invalid_request',
  [HttpStatus.UNAUTHORIZED]: 'authentication_required',
  [HttpStatus.FORBIDDEN]: 'access_denied',
  [HttpStatus.NOT_FOUND]: 'resource_not_found',
  [HttpStatus.CONFLICT]: 'conflict',
  [HttpStatus.TOO_MANY_REQUESTS]: 'rate_limit_exceeded',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'unexpected_error',
};

function getTitle(status: number): string {
  const statusName = HttpStatus[status] ?? 'Error';

  return statusName
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    if (status >= 500) {
      this.logger.error({ err: exception }, 'Unexpected request failure');
    }
    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const problem =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? exceptionResponse
        : null;
    const customDetail =
      problem && 'detail' in problem && typeof problem.detail === 'string'
        ? problem.detail
        : null;
    const customCode =
      problem && 'code' in problem && typeof problem.code === 'string'
        ? problem.code
        : null;

    response
      .status(status)
      .type('application/problem+json')
      .json({
        type: 'about:blank',
        title: getTitle(status),
        status,
        detail: isHttpException
          ? (customDetail ?? exception.message)
          : 'An unexpected error occurred',
        instance: request.originalUrl,
        code: customCode ?? problemCodes[status] ?? 'http_error',
      });
  }
}
