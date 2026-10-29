import { Injectable } from '@nestjs/common';
import { ConflictError, MatchNotFoundError, STALE_WRITE_MESSAGE } from '../../domain/errors';
import { Match, MatchStatus } from '../../domain/match';
import { LoadedMatch, MatchRepository } from '../../domain/match.repository';

type StoredMatch = {
  id: string;
  status: MatchStatus;
  scores: Array<{ playerId: string; points: number }>;
  createdAt: string;
  finishedAt: string | null;
  version: number;
};

@Injectable()
export class InMemoryMatchRepository implements MatchRepository {
  private readonly rows = new Map<string, StoredMatch>();

  async findById(id: string): Promise<LoadedMatch | null> {
    const row = this.rows.get(id);
    if (!row) return null;
    return {
      version: row.version,
      match: Match.restore({
        id: row.id,
        status: row.status,
        scores: row.scores.map((score) => ({ ...score })),
        createdAt: new Date(row.createdAt),
        finishedAt: row.finishedAt ? new Date(row.finishedAt) : null,
      }),
    };
  }

  async save(match: Match, expectedVersion: number | null): Promise<number> {
    const view = match.toView();
    const scores = view.scores.map(({ playerId, points }) => ({ playerId, points }));

    if (expectedVersion === null) {
      if (this.rows.has(view.id)) throw new ConflictError('A rodada já existe.');
      this.rows.set(view.id, {
        id: view.id,
        status: view.status,
        scores,
        createdAt: view.createdAt,
        finishedAt: view.finishedAt,
        version: 1,
      });
      return 1;
    }

    const current = this.rows.get(view.id);
    if (!current) throw new MatchNotFoundError(view.id);
    if (current.version !== expectedVersion) throw new ConflictError(STALE_WRITE_MESSAGE);

    const version = current.version + 1;
    this.rows.set(view.id, {
      id: view.id,
      status: view.status,
      scores,
      createdAt: view.createdAt,
      finishedAt: view.finishedAt,
      version,
    });
    return version;
  }
}
