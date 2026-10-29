import { Namespace, Socket } from 'socket.io';
import { presentMatch } from '../../application/present-match';
import { Match } from '../../domain/match';
import { MatchLiveGateway } from './match-live.gateway';

describe('MatchLiveGateway', () => {
  const gateway = new MatchLiveGateway();
  const matchId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  function client(): Socket {
    return {
      id: 'socket-1',
      rooms: new Set<string>(['socket-1', 'sala-antiga']),
      leave: jest.fn(),
      join: jest.fn(),
    } as unknown as Socket;
  }

  it('recusa inscrição sem UUID', () => {
    const socket = client();
    expect(gateway.subscribe(socket, undefined)).toEqual({ ok: false, error: 'matchId inválido' });
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('troca a sala do cliente para a rodada', () => {
    const socket = client();
    expect(gateway.subscribe(socket, { matchId })).toEqual({ ok: true });
    expect(socket.leave).toHaveBeenCalledWith('sala-antiga');
    expect(socket.leave).not.toHaveBeenCalledWith('socket-1');
    expect(socket.join).toHaveBeenCalledWith(matchId);
  });

  it('emite o evento só para a sala da rodada', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    gateway.server = { to } as unknown as Namespace;
    const payload = {
      reason: 'score_recorded' as const,
      match: presentMatch(Match.open(matchId, new Date('2026-10-26T15:00:00.000Z')), 1),
    };

    gateway.broadcast(payload);

    expect(to).toHaveBeenCalledWith(matchId);
    expect(emit).toHaveBeenCalledWith('match.updated', payload);
  });
});
