import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { APP_CONFIG, AppConfig } from '../config/app-config';
import { MatchEvents, MatchUpdatedEvent } from '../matches/domain/match-events';
import { OUTBOUND_QUEUE, OutboundQueue } from './outbound-queue';

@Injectable()
export class LocalMatchEvents implements MatchEvents {
  private readonly logger = new Logger(LocalMatchEvents.name);

  constructor(
    private readonly emitter: EventEmitter2,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(OUTBOUND_QUEUE) private readonly queue: OutboundQueue,
  ) {}

  async publish(event: MatchUpdatedEvent): Promise<void> {
    this.emitter.emit('match.updated', event);
    if (this.config.eventBus !== 'sqs') return;

    try {
      await this.queue.send(JSON.stringify(event));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // A pontuação já foi commitada. Falhar a requisição aqui faria o cliente tentar de novo e somar duas vezes.
      this.logger.error(
        `A rodada ${event.match.id} foi salva, mas a fila não recebeu ${event.reason}. ${message}`,
      );
    }
  }
}
