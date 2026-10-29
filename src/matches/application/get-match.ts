import { Inject, Injectable } from '@nestjs/common';
import { MATCH_REPOSITORY, MatchRepository } from '../domain/match.repository';
import { loadMatch } from './load-match';
import { presentMatch } from './present-match';

@Injectable()
export class GetMatch {
  constructor(@Inject(MATCH_REPOSITORY) private readonly matches: MatchRepository) {}

  async execute(matchId: string) {
    const loaded = await loadMatch(this.matches, matchId);
    return presentMatch(loaded.match, loaded.version);
  }
}
