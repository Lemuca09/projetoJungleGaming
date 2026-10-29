import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { httpStatusFor } from './domain-exception.filter';

@Injectable()
export class RequestLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('http');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<Request>();
    const requestId = String(request.headers['x-request-id'] ?? '');
    const started = Date.now();
    const line = (status: number) =>
      `${requestId} ${request.method} ${request.originalUrl} -> ${status} ${Date.now() - started}ms`;

    return next.handle().pipe(
      tap(() => {
        const status = context.switchToHttp().getResponse<{ statusCode: number }>().statusCode;
        this.logger.log(line(status));
      }),
      catchError((error: unknown) => {
        this.logger.log(line(httpStatusFor(error) ?? 500));
        return throwError(() => error);
      }),
    );
  }
}
