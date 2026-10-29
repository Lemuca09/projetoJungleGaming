import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Namespace, Socket } from 'socket.io';
import { MatchUpdatedEvent } from '../../domain/match-events';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@WebSocketGateway({ namespace: 'live', cors: { origin: '*' } })
export class MatchLiveGateway {
  @WebSocketServer()
  server!: Namespace;

  @SubscribeMessage('match.subscribe')
  subscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { matchId?: string } | undefined,
  ): { ok: boolean; error?: string } {
    const matchId = body?.matchId ?? '';
    if (!UUID_V4.test(matchId)) return { ok: false, error: 'matchId inválido' };

    for (const room of [...client.rooms]) {
      if (room !== client.id) client.leave(room);
    }
    client.join(matchId);
    return { ok: true };
  }

  @OnEvent('match.updated')
  broadcast(event: MatchUpdatedEvent): void {
    if (!this.server) return;
    this.server.to(event.match.id).emit('match.updated', event);
  }
}
