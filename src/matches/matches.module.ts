import { DynamicModule, Module } from '@nestjs/common';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { IgnoringOutboundQueue, OUTBOUND_QUEUE } from '../messaging/outbound-queue';
import { LocalMatchEvents } from '../messaging/local-match-events';
import { SqsOutboundQueue } from '../messaging/sqs-outbound-queue';
import { CLOCK, SystemClock } from '../shared/clock';
import { FinishMatch } from './application/finish-match';
import { GetMatch } from './application/get-match';
import { RecordScore } from './application/record-score';
import { StartMatch } from './application/start-match';
import { MATCH_EVENTS } from './domain/match-events';
import { MATCH_REPOSITORY } from './domain/match.repository';
import { MatchesController } from './infrastructure/http/matches.controller';
import { InMemoryMatchRepository } from './infrastructure/persistence/in-memory-match.repository';
import { MikroMatchRepository } from './infrastructure/persistence/mikro-match.repository';
import { MatchLiveGateway } from './infrastructure/ws/match-live.gateway';

@Module({})
export class MatchesModule {
  static register(options: { persistence: 'postgres' | 'memory' }): DynamicModule {
    return {
      module: MatchesModule,
      controllers: [MatchesController],
      providers: [
        StartMatch,
        RecordScore,
        FinishMatch,
        GetMatch,
        MatchLiveGateway,
        { provide: CLOCK, useClass: SystemClock },
        { provide: MATCH_EVENTS, useClass: LocalMatchEvents },
        {
          provide: MATCH_REPOSITORY,
          useClass: options.persistence === 'postgres' ? MikroMatchRepository : InMemoryMatchRepository,
        },
        {
          provide: OUTBOUND_QUEUE,
          inject: [APP_CONFIG],
          useFactory: (config: AppConfig) =>
            config.eventBus === 'sqs' ? new SqsOutboundQueue(config) : new IgnoringOutboundQueue(),
        },
      ],
    };
  }
}
