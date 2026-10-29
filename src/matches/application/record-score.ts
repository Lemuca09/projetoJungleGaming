import { Inject, Injectable } from '@nestjs/common';
import { MATCH_EVENTS, MatchEvents } from '../domain/match-events';
import { PlayerId, ScorePoints } from '../domain/match';
import { MATCH_REPOSITORY, MatchRepository } from '../domain/match.repository';
import { loadMatch } from './load-match';
import { presentMatch } from './present-match';

/**
 * Caminho de uma pontuação:
 * HTTP → RecordScore → Match.record → MatchRepository.save → PostgreSQL
 * → evento match.updated → WebSocket (e SQS, se estiver ligado).
 */
@Injectable()
export class RecordScore {
  constructor(
    @Inject(MATCH_REPOSITORY) private readonly matches: MatchRepository,
    @Inject(MATCH_EVENTS) private readonly events: MatchEvents,
  ) {}

  async execute(input: { matchId: string; playerId: string; points: number; conflictDemo?: boolean }) {
    const loaded = await loadMatch(this.matches, input.matchId);
    loaded.match.record(PlayerId.create(input.playerId), ScorePoints.create(input.points));
    // As duas requisições da simulação leem a mesma versão e só então tentam gravar.
    // A segunda encontra a versão nova, responde 409 e não altera o placar.
    if (input.conflictDemo) await delay(CONFLICT_DEMO_HOLD_MS);
    const version = await this.matches.save(loaded.match, loaded.version);
    const snapshot = presentMatch(loaded.match, version);
    await this.events.publish({ reason: 'score_recorded', match: snapshot });
    return snapshot;
  }
}

const CONFLICT_DEMO_HOLD_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
