import { Match } from '../domain/match';
import { MatchSnapshot } from '../domain/match-events';

export function presentMatch(match: Match, version: number): MatchSnapshot {
  if (!Number.isInteger(version) || version < 1) {
    throw new Error('Versão persistida inválida.');
  }
  return { ...match.toView(), version };
}
