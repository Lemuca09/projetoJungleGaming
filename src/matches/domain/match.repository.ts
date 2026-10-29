import { Match } from './match';

export const MATCH_REPOSITORY = Symbol('MATCH_REPOSITORY');

export type LoadedMatch = {
  match: Match;
  version: number;
};

export interface MatchRepository {
  findById(id: string): Promise<LoadedMatch | null>;
  /** `expectedVersion` null insere. Devolve a versão gravada. */
  save(match: Match, expectedVersion: number | null): Promise<number>;
}
