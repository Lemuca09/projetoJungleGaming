import { DomainError } from './errors';
import { Match, PlayerId, ScorePoints } from './match';

const now = new Date('2026-10-26T15:00:00.000Z');

function openMatch(): Match {
  return Match.open('match-1', now);
}

describe('Match', () => {
  it('acumula pontos do mesmo jogador', () => {
    const match = openMatch();
    match.record(PlayerId.create('luna'), ScorePoints.create(10));
    match.record(PlayerId.create('  luna  '), ScorePoints.create(5));

    expect(match.toView().scores).toEqual([{ playerId: 'luna', points: 15, rank: 1 }]);
  });

  it('empata no primeiro lugar e deixa o seguinte em terceiro', () => {
    const match = openMatch();
    match.record(PlayerId.create('bia'), ScorePoints.create(10));
    match.record(PlayerId.create('ana'), ScorePoints.create(10));
    match.record(PlayerId.create('caio'), ScorePoints.create(3));

    expect(match.toView().scores).toEqual([
      { playerId: 'ana', points: 10, rank: 1 },
      { playerId: 'bia', points: 10, rank: 1 },
      { playerId: 'caio', points: 3, rank: 3 },
    ]);
    expect(match.toView().leaders).toEqual(['ana', 'bia']);
  });

  it('aceita dois envios de 100 e recusa ponto fora da faixa', () => {
    const match = openMatch();
    match.record(PlayerId.create('luna'), ScorePoints.create(100));
    match.record(PlayerId.create('luna'), ScorePoints.create(100));
    expect(match.toView().scores[0]?.points).toBe(200);

    expect(() => ScorePoints.create(0)).toThrow(DomainError);
    expect(() => ScorePoints.create(101)).toThrow(DomainError);
    expect(() => ScorePoints.create(1.5)).toThrow(DomainError);
  });

  it('recusa jogador vazio ou com espaço no meio', () => {
    expect(() => PlayerId.create('a')).toThrow(DomainError);
    expect(() => PlayerId.create('lu na')).toThrow(DomainError);
  });

  it('não pontua nem encerra de novo uma rodada encerrada', () => {
    const match = openMatch();
    match.record(PlayerId.create('luna'), ScorePoints.create(4));
    match.finish(new Date('2026-10-26T15:10:00.000Z'));
    const finished = match.toView();

    expect(finished.status).toBe('finished');
    expect(finished.finishedAt).toBe('2026-10-26T15:10:00.000Z');
    expect(() => match.record(PlayerId.create('kael'), ScorePoints.create(1))).toThrow(DomainError);
    expect(() => match.finish(now)).toThrow(DomainError);
    expect(match.toView()).toEqual(finished);
  });

  it('encerra mesmo sem pontos', () => {
    const match = openMatch();
    match.finish(now);
    expect(match.toView()).toMatchObject({ status: 'finished', scores: [], leaders: [] });
  });
});
