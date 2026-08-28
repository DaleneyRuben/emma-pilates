import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
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
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    response
      .status(status)
      .type('application/problem+json')
      .json({
        type: 'about:blank',
        title: getTitle(status),
        status,
        detail: isHttpException
          ? exception.message
          : 'An unexpected error occurred',
        instance: request.originalUrl,
        code: problemCodes[status] ?? 'http_error',
      });
  }
}
