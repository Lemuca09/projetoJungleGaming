import { EntityManager, LockMode, MikroORM } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ConflictError, MatchNotFoundError, STALE_WRITE_MESSAGE } from '../../domain/errors';
import { Match, MatchStatus } from '../../domain/match';
import { LoadedMatch, MatchRepository } from '../../domain/match.repository';
import { MatchOrmEntity, MatchScoreOrmEntity } from './orm-entities';

@Injectable()
export class MikroMatchRepository implements MatchRepository {
  constructor(private readonly orm: MikroORM) {}

  async findById(id: string): Promise<LoadedMatch | null> {
    const em = this.orm.em.fork();
    const row = await em.findOne(MatchOrmEntity, { id });
    if (!row) return null;
    const scores = await em.find(MatchScoreOrmEntity, { match: { id } });
    return {
      version: row.version,
      match: Match.restore({
        id: row.id,
        status: asStatus(row.status),
        scores: scores.map((score) => ({ playerId: score.playerId, points: score.points })),
        createdAt: asDate(row.createdAt),
        finishedAt: row.finishedAt ? asDate(row.finishedAt) : null,
      }),
    };
  }

  async save(match: Match, expectedVersion: number | null): Promise<number> {
    const em = this.orm.em.fork();
    return em.transactional(async (tem) => {
      const view = match.toView();

      if (expectedVersion === null) {
        if (await tem.findOne(MatchOrmEntity, { id: view.id })) {
          throw new ConflictError('A rodada já existe.');
        }
        const row = tem.create(MatchOrmEntity, {
          id: view.id,
          status: view.status,
          createdAt: new Date(view.createdAt),
          finishedAt: view.finishedAt ? new Date(view.finishedAt) : null,
          version: 1,
        });
        tem.persist(row);
        this.replaceScores(tem, row, view.scores, []);
        return 1;
      }

      // FOR UPDATE faz a escrita concorrente esperar e ler a versão já commitada.
      const row = await tem.findOne(
        MatchOrmEntity,
        { id: view.id },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!row) throw new MatchNotFoundError(view.id);
      if (row.version !== expectedVersion) throw new ConflictError(STALE_WRITE_MESSAGE);

      row.status = view.status;
      row.finishedAt = view.finishedAt ? new Date(view.finishedAt) : null;
      row.version = expectedVersion + 1;

      const existing = await tem.find(MatchScoreOrmEntity, { match: { id: view.id } });
      this.replaceScores(tem, row, view.scores, existing);
      return row.version;
    });
  }

  private replaceScores(
    em: EntityManager,
    row: MatchOrmEntity,
    scores: Array<{ playerId: string; points: number }>,
    existing: MatchScoreOrmEntity[],
  ): void {
    const incoming = new Map(scores.map((score) => [score.playerId, score.points]));
    for (const score of existing) {
      const points = incoming.get(score.playerId);
      if (points === undefined) {
        em.remove(score);
        continue;
      }
      score.points = points;
      incoming.delete(score.playerId);
    }
    for (const [playerId, points] of incoming) {
      em.persist(
        em.create(MatchScoreOrmEntity, {
          id: randomUUID(),
          match: row,
          playerId,
          points,
        }),
      );
    }
  }
}

function asStatus(value: string): MatchStatus {
  if (value === 'open' || value === 'finished') return value;
  throw new Error(`Status persistido desconhecido: ${value}`);
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
