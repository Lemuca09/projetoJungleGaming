import { DomainError } from './errors';

export type MatchStatus = 'open' | 'finished';

export type ScoreView = {
  playerId: string;
  points: number;
  rank: number;
};

export type MatchView = {
  id: string;
  status: MatchStatus;
  scores: ScoreView[];
  leaders: string[];
  createdAt: string;
  finishedAt: string | null;
};

const PLAYER_ID = /^[a-zA-Z0-9_-]{2,32}$/;

export class PlayerId {
  private constructor(readonly value: string) {}

  static create(raw: string): PlayerId {
    if (typeof raw !== 'string') {
      throw new DomainError('INVALID_PLAYER', 'O jogador deve ser um texto de 2 a 32 caracteres.');
    }
    const value = raw.trim();
    if (!PLAYER_ID.test(value)) {
      throw new DomainError(
        'INVALID_PLAYER',
        'O jogador deve ter 2 a 32 caracteres (letras, números, _ ou -).',
      );
    }
    return new PlayerId(value);
  }
}

export class ScorePoints {
  private constructor(readonly value: number) {}

  static create(raw: number): ScorePoints {
    if (!Number.isInteger(raw) || raw < 1 || raw > 100) {
      throw new DomainError('INVALID_SCORE', 'A pontuação deve ser um inteiro de 1 a 100.');
    }
    return new ScorePoints(raw);
  }
}

export class Match {
  private _status: MatchStatus;
  private _finishedAt: Date | null;
  private readonly scores = new Map<string, number>();

  private constructor(
    readonly id: string,
    status: MatchStatus,
    scores: Iterable<readonly [string, number]>,
    readonly createdAt: Date,
    finishedAt: Date | null,
  ) {
    this._status = status;
    this._finishedAt = finishedAt;
    for (const [playerId, points] of scores) this.scores.set(playerId, points);
  }

  static open(id: string, now: Date): Match {
    return new Match(id, 'open', [], now, null);
  }

  static restore(state: {
    id: string;
    status: MatchStatus;
    scores: Array<{ playerId: string; points: number }>;
    createdAt: Date;
    finishedAt: Date | null;
  }): Match {
    return new Match(
      state.id,
      state.status,
      state.scores.map((score) => [score.playerId, score.points] as const),
      state.createdAt,
      state.finishedAt,
    );
  }

  get status(): MatchStatus {
    return this._status;
  }

  record(playerId: PlayerId, points: ScorePoints): void {
    if (this._status !== 'open') {
      throw new DomainError('MATCH_NOT_OPEN', 'Não é possível pontuar em uma rodada encerrada.');
    }
    const total = (this.scores.get(playerId.value) ?? 0) + points.value;
    this.scores.set(playerId.value, total);
  }

  finish(now: Date): void {
    if (this._status !== 'open') {
      throw new DomainError('MATCH_NOT_OPEN', 'A rodada já está encerrada.');
    }
    this._status = 'finished';
    this._finishedAt = now;
  }

  toView(): MatchView {
    const scores = this.leaderboard();
    return {
      id: this.id,
      status: this._status,
      scores,
      leaders: scores.filter((score) => score.rank === 1).map((score) => score.playerId),
      createdAt: this.createdAt.toISOString(),
      finishedAt: this._finishedAt ? this._finishedAt.toISOString() : null,
    };
  }

  private leaderboard(): ScoreView[] {
    const ordered = [...this.scores.entries()]
      .map(([playerId, points]) => ({ playerId, points }))
      .sort((a, b) => b.points - a.points || a.playerId.localeCompare(b.playerId));

    let lastPoints: number | undefined;
    let rank = 0;
    return ordered.map((entry, index) => {
      if (entry.points !== lastPoints) {
        rank = index + 1;
        lastPoints = entry.points;
      }
      return { ...entry, rank };
    });
  }
}
