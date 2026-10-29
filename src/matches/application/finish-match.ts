import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '../../shared/clock';
import { MATCH_EVENTS, MatchEvents } from '../domain/match-events';
import { MATCH_REPOSITORY, MatchRepository } from '../domain/match.repository';
import { loadMatch } from './load-match';
import { presentMatch } from './present-match';

@Injectable()
export class FinishMatch {
  constructor(
    @Inject(MATCH_REPOSITORY) private readonly matches: MatchRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MATCH_EVENTS) private readonly events: MatchEvents,
  ) {}

  async execute(matchId: string) {
    const loaded = await loadMatch(this.matches, matchId);
    loaded.match.finish(this.clock.now());
    const version = await this.matches.save(loaded.match, loaded.version);
    const snapshot = presentMatch(loaded.match, version);
    await this.events.publish({ reason: 'finished', match: snapshot });
    return snapshot;
  }
}
