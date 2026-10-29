import { randomUUID } from 'node:crypto';
import { ConflictError } from '../domain/errors';
import { Match, PlayerId, ScorePoints } from '../domain/match';
import { MatchRepository } from '../domain/match.repository';

export async function expectStaleWriteToFail(repo: MatchRepository): Promise<void> {
  const created = Match.open(randomUUID(), new Date('2026-10-26T15:00:00.000Z'));
  const version = await repo.save(created, null);
  const first = await repo.findById(created.id);
  const second = await repo.findById(created.id);
  if (!first || !second) throw new Error('A rodada não foi recarregada.');

  first.match.record(PlayerId.create('luna'), ScorePoints.create(10));
  first.match.finish(new Date('2026-10-26T15:05:00.000Z'));
  second.match.record(PlayerId.create('kael'), ScorePoints.create(8));

  await repo.save(first.match, first.version);
  await expect(repo.save(second.match, second.version)).rejects.toBeInstanceOf(ConflictError);

  const stored = await repo.findById(created.id);
  expect(stored?.version).toBe(version + 1);
  expect(stored?.match.toView().status).toBe('finished');
  expect(stored?.match.toView().finishedAt).not.toBeNull();
  expect(stored?.match.toView().scores.map((score) => score.playerId)).toEqual(['luna']);
}
