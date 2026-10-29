import { MatchView } from './match';

export const MATCH_EVENTS = Symbol('MATCH_EVENTS');

export type MatchSnapshot = MatchView & {
  version: number;
};

export type MatchUpdatedEvent = {
  reason: 'started' | 'score_recorded' | 'finished';
  match: MatchSnapshot;
};

export interface MatchEvents {
  publish(event: MatchUpdatedEvent): Promise<void>;
}
