import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { APP_CONFIG, AppConfig } from './config/app-config';
import { configureApp } from './configure-app';

function errorText(error: unknown, depth = 0): string {
  if (depth > 5 || error == null || typeof error !== 'object') return '';
  const record = error as { message?: unknown; cause?: unknown; errors?: unknown[] };
  const message = typeof record.message === 'string' ? record.message : '';
  const nested = Array.isArray(record.errors) ? record.errors.map((item) => errorText(item, depth + 1)).join(' ') : '';
  return `${message} ${nested} ${errorText(record.cause, depth + 1)}`;
}

function isTransientDbError(error: unknown): boolean {
  return /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|starting up|Connection terminated|timeout expired|the database system is starting/i.test(
    errorText(error),
  );
}

async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  app.useStaticAssets(join(__dirname, '..', 'public'));
  return app;
}

async function bootstrap(): Promise<void> {
  const attempts = 15;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const app = await createApp();
      const config = app.get<AppConfig>(APP_CONFIG);
      await app.listen(config.port);
      Logger.log(`Jungle Rounds em http://localhost:${config.port}`, 'bootstrap');
      return;
    } catch (error) {
      const transient = isTransientDbError(error);
      if (!transient || attempt === attempts) {
        if (transient) {
          Logger.error(
            'Não conectei no PostgreSQL. Suba o banco com: docker compose up postgres -d',
            'bootstrap',
          );
        }
        throw error;
      }
      Logger.warn(`PostgreSQL ainda não aceitou conexão (${attempt}/${attempts}).`, 'bootstrap');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

void bootstrap();
