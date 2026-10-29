import { FixedClock } from '../../shared/clock';
import { ConflictError, DomainError, MatchNotFoundError } from '../domain/errors';
import { MatchEvents, MatchUpdatedEvent } from '../domain/match-events';
import { FinishMatch } from './finish-match';
import { GetMatch } from './get-match';
import { InMemoryMatchRepository } from '../infrastructure/persistence/in-memory-match.repository';
import { RecordScore } from './record-score';
import { StartMatch } from './start-match';

class FakeEvents implements MatchEvents {
  readonly published: MatchUpdatedEvent[] = [];

  async publish(event: MatchUpdatedEvent): Promise<void> {
    this.published.push(event);
  }
}

describe('casos de uso da rodada', () => {
  const clock = new FixedClock(new Date('2026-10-26T15:00:00.000Z'));

  function setup() {
    const matches = new InMemoryMatchRepository();
    const events = new FakeEvents();
    return {
      events,
      start: new StartMatch(matches, clock, events),
      record: new RecordScore(matches, events),
      finish: new FinishMatch(matches, clock, events),
      get: new GetMatch(matches),
    };
  }

  it('abre, acumula, encerra e só então publica cada fato', async () => {
    const { start, record, finish, get, events } = setup();
    const opened = await start.execute();

    expect(opened).toMatchObject({ status: 'open', version: 1, createdAt: '2026-10-26T15:00:00.000Z', scores: [] });

    const scored = await record.execute({ matchId: opened.id, playerId: 'luna', points: 10 });
    const again = await record.execute({ matchId: opened.id, playerId: 'luna', points: 5 });
    const finished = await finish.execute(opened.id);
    const loaded = await get.execute(opened.id);

    expect(scored.scores).toEqual([{ playerId: 'luna', points: 10, rank: 1 }]);
    expect(again.version).toBe(3);
    expect(finished.status).toBe('finished');
    expect(finished.leaders).toEqual(['luna']);
    expect(loaded).toEqual(finished);
    expect(events.published.map((event) => event.reason)).toEqual([
      'started',
      'score_recorded',
      'score_recorded',
      'finished',
    ]);
  });

  it('grava o valor inteiro uma vez e recusa a escrita duplicada', async () => {
    const { start, record, get, events } = setup();
    const opened = await start.execute();

    const attempts = await Promise.allSettled([
      record.execute({ matchId: opened.id, playerId: 'luna', points: 10, conflictDemo: true }),
      record.execute({ matchId: opened.id, playerId: 'luna', points: 10, conflictDemo: true }),
    ]);

    const rejected = attempts.filter((attempt) => attempt.status === 'rejected');
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ConflictError);

    const loaded = await get.execute(opened.id);
    expect(loaded.scores).toEqual([{ playerId: 'luna', points: 10, rank: 1 }]);
    expect(loaded.version).toBe(2);
    expect(events.published.filter((event) => event.reason === 'score_recorded')).toHaveLength(1);
  });

  it('não publica evento se a rodada já estiver encerrada', async () => {
    const { start, record, finish, events } = setup();
    const opened = await start.execute();
    await finish.execute(opened.id);
    events.published.length = 0;

    await expect(record.execute({ matchId: opened.id, playerId: 'kael', points: 5 })).rejects.toBeInstanceOf(
      DomainError,
    );
    expect(events.published).toEqual([]);
  });

  it('não publica evento se a gravação falhar', async () => {
    const matches = new InMemoryMatchRepository();
    const events = new FakeEvents();
    const start = new StartMatch(matches, clock, events);
    jest.spyOn(matches, 'save').mockRejectedValue(new Error('disco cheio'));

    await expect(start.execute()).rejects.toThrow('disco cheio');
    expect(events.published).toEqual([]);
  });

  it('responde que a rodada não existe', async () => {
    const { get } = setup();
    await expect(get.execute('11111111-1111-4111-8111-111111111111')).rejects.toBeInstanceOf(MatchNotFoundError);
  });
});
