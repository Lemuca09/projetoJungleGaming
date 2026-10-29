import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigModule } from './config/config.module';
import { loadConfig } from './config/load-config';
import { mikroOptions } from './database/mikro-options';
import { SchemaInitializer } from './database/schema-initializer';
import { GuideController } from './guide/guide.controller';
import { HealthController } from './health/health.controller';
import { MatchesModule } from './matches/matches.module';

const config = loadConfig(process.env);

@Module({
  imports: [
    AppConfigModule.forValue(config),
    EventEmitterModule.forRoot(),
    MikroOrmModule.forRoot(mikroOptions(config)),
    MatchesModule.register({ persistence: 'postgres' }),
  ],
  controllers: [HealthController, GuideController],
  providers: [SchemaInitializer],
})
export class AppModule {}
