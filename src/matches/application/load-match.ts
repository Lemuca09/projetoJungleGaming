import { MatchNotFoundError } from '../domain/errors';
import { MatchRepository } from '../domain/match.repository';

export async function loadMatch(matches: MatchRepository, matchId: string) {
  const loaded = await matches.findById(matchId);
  if (!loaded) throw new MatchNotFoundError(matchId);
  return loaded;
}
