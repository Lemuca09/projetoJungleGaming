export class DomainError extends Error {
  constructor(
    readonly code: 'INVALID_PLAYER' | 'INVALID_SCORE' | 'MATCH_NOT_OPEN',
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export const STALE_WRITE_MESSAGE =
  'A rodada foi atualizada por outra requisição. Recarregue e tente de novo.';

export class ConflictError extends Error {
  readonly code = 'CONFLICT' as const;

  constructor(message: string = STALE_WRITE_MESSAGE) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class MatchNotFoundError extends Error {
  readonly code = 'MATCH_NOT_FOUND' as const;

  constructor(readonly matchId: string) {
    super(`Rodada ${matchId} não encontrada.`);
    this.name = 'MatchNotFoundError';
  }
}
