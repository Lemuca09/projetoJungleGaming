import { INestApplication } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { AppConfigModule } from '../../config/config.module';
import { loadConfig } from '../../config/load-config';
import { configureApp } from '../../configure-app';
import { CLOCK, Clock, SystemClock } from '../../shared/clock';
import { MatchesModule } from '../matches.module';

export async function createTestApp(clock: Clock = new SystemClock()): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      AppConfigModule.forValue(loadConfig({ EVENT_BUS: 'local', DB_AUTO_MIGRATE: 'false' })),
      EventEmitterModule.forRoot(),
      MatchesModule.register({ persistence: 'memory' }),
    ],
  })
    .overrideProvider(CLOCK)
    .useValue(clock)
    .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}
