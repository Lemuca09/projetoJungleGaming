import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CLOCK, Clock } from '../../shared/clock';
import { MATCH_EVENTS, MatchEvents } from '../domain/match-events';
import { Match } from '../domain/match';
import { MATCH_REPOSITORY, MatchRepository } from '../domain/match.repository';
import { presentMatch } from './present-match';

@Injectable()
export class StartMatch {
  constructor(
    @Inject(MATCH_REPOSITORY) private readonly matches: MatchRepository,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(MATCH_EVENTS) private readonly events: MatchEvents,
  ) {}

  async execute() {
    const match = Match.open(randomUUID(), this.clock.now());
    const version = await this.matches.save(match, null);
    const snapshot = presentMatch(match, version);
    await this.events.publish({ reason: 'started', match: snapshot });
    return snapshot;
  }
}
