import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ConflictError, DomainError, MatchNotFoundError } from '../matches/domain/errors';

export function httpStatusFor(exception: unknown): number | null {
  if (exception instanceof MatchNotFoundError) return 404;
  if (exception instanceof ConflictError) return 409;
  if (exception instanceof DomainError) return exception.code === 'MATCH_NOT_OPEN' ? 409 : 400;
  if (exception instanceof HttpException) return exception.getStatus();
  return null;
}

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') return;

    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const requestId = String(request.headers['x-request-id'] ?? '');

    if (exception instanceof MatchNotFoundError || exception instanceof ConflictError) {
      response.status(httpStatusFor(exception) ?? 500).json({
        error: exception.code,
        message: exception.message,
        requestId,
      });
      return;
    }

    if (exception instanceof DomainError) {
      response.status(httpStatusFor(exception) ?? 400).json({
        error: exception.code,
        message: exception.message,
        requestId,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const payload = typeof body === 'string' ? { message: body } : body;
      response.status(exception.getStatus()).json(
        typeof payload === 'object' && payload !== null ? { ...payload, requestId } : { message: payload, requestId },
      );
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    response.status(500).json({ error: 'INTERNAL', message: 'Erro interno.', requestId });
  }
}
