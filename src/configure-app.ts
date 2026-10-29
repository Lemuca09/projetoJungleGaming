import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { DomainExceptionFilter } from './shared/domain-exception.filter';
import { RequestLogInterceptor } from './shared/request-log.interceptor';
import { validationExceptionFactory } from './shared/validation-exception';

export function configureApp(app: INestApplication): void {
  app.getHttpAdapter().getInstance().use((req: Request, res: Response, next: NextFunction) => {
    const incoming = req.header('x-request-id')?.trim();
    const requestId = incoming && /^[\w.-]{1,100}$/.test(incoming) ? incoming : randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.useGlobalFilters(new DomainExceptionFilter());
  app.useGlobalInterceptors(new RequestLogInterceptor());
  app.enableCors({ origin: true, exposedHeaders: ['x-request-id'] });
  app.enableShutdownHooks();
}
