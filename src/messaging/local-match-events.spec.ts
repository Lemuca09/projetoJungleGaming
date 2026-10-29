import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { loadConfig } from '../config/load-config';
import { Match } from '../matches/domain/match';
import { presentMatch } from '../matches/application/present-match';
import { OutboundQueue } from './outbound-queue';
import { LocalMatchEvents } from './local-match-events';

function event() {
  const match = Match.open('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', new Date('2026-10-26T15:00:00.000Z'));
  return { reason: 'started' as const, match: presentMatch(match, 1) };
}

describe('LocalMatchEvents', () => {
  it('entrega no processo e não chama a fila no modo local', async () => {
    const emitter = new EventEmitter2();
    const received: unknown[] = [];
    emitter.on('match.updated', (payload) => received.push(payload));
    const queue: OutboundQueue = { send: jest.fn() };
    const events = new LocalMatchEvents(emitter, loadConfig({ EVENT_BUS: 'local' }), queue);
    const payload = event();

    await events.publish(payload);

    expect(received).toEqual([payload]);
    expect(queue.send).not.toHaveBeenCalled();
  });

  it('publica o mesmo JSON na SQS', async () => {
    const queue: OutboundQueue = { send: jest.fn().mockResolvedValue(undefined) };
    const events = new LocalMatchEvents(
      new EventEmitter2(),
      loadConfig({
        EVENT_BUS: 'sqs',
        AWS_REGION: 'us-east-1',
        SQS_QUEUE_URL: 'https://sqs.us-east-1.amazonaws.com/123456789012/jungle-rounds',
      }),
      queue,
    );
    const payload = event();

    await events.publish(payload);

    expect(queue.send).toHaveBeenCalledWith(JSON.stringify(payload));
  });

  it('mantém a resposta de sucesso se a fila falhar depois do commit', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const queue: OutboundQueue = { send: jest.fn().mockRejectedValue(new Error('fila fora')) };
    const events = new LocalMatchEvents(
      new EventEmitter2(),
      loadConfig({
        EVENT_BUS: 'sqs',
        AWS_REGION: 'us-east-1',
        SQS_QUEUE_URL: 'https://sqs.us-east-1.amazonaws.com/123456789012/jungle-rounds',
      }),
      queue,
    );

    await expect(events.publish(event())).resolves.toBeUndefined();
    jest.restoreAllMocks();
  });
});
