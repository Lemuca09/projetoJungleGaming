import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { MatchUpdatedEvent } from './domain/match-events';
import { createTestApp } from './test-support/create-test-app';

jest.setTimeout(20000);

describe('HTTP e WebSocket', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
  });

  function http(): Server {
    return app.getHttpServer() as Server;
  }

  function baseUrl(): string {
    return `http://127.0.0.1:${(http().address() as AddressInfo).port}`;
  }

  async function openSocket(matchId: string): Promise<{ socket: Socket; received: MatchUpdatedEvent[] }> {
    const socket = io(`${baseUrl()}/live`, { transports: ['websocket'] });
    const received: MatchUpdatedEvent[] = [];
    socket.on('match.updated', (event: MatchUpdatedEvent) => received.push(event));

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('socket não conectou')), 3000);
      socket.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      socket.on('connect_error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });

    const ack = await new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('inscrição sem resposta')), 3000);
      socket.emit('match.subscribe', { matchId }, (response: unknown) => {
        clearTimeout(timer);
        resolve(response);
      });
    });
    expect(ack).toEqual({ ok: true });
    return { socket, received };
  }

  it('abre, pontua, transmite, encerra e recusa ponto depois', async () => {
    const started = await request(http()).post('/api/matches').expect(201);
    expect(started.headers['x-request-id']).toEqual(expect.any(String));
    expect(started.body).toMatchObject({ status: 'open', version: 1, scores: [] });
    const id = started.body.id as string;
    const { socket, received } = await openSocket(id);

    try {
      const scored = await request(http())
        .post(`/api/matches/${id}/scores`)
        .send({ playerId: 'luna', points: 10 })
        .expect(200);
      expect(scored.body.scores).toEqual([{ playerId: 'luna', points: 10, rank: 1 }]);

      await request(http()).post(`/api/matches/${id}/scores`).send({ playerId: 'kael', points: 10 }).expect(200);
      const finished = await request(http()).post(`/api/matches/${id}/finish`).expect(200);
      expect(finished.body.status).toBe('finished');
      expect(finished.body.leaders).toEqual(['kael', 'luna']);

      await waitFor(() => received.filter((event) => event.reason === 'score_recorded').length >= 2);
      await waitFor(() => received.some((event) => event.reason === 'finished'));

      const denied = await request(http())
        .post(`/api/matches/${id}/scores`)
        .send({ playerId: 'luna', points: 1 })
        .expect(409);
      expect(denied.body.error).toBe('MATCH_NOT_OPEN');

      const extra = await request(http())
        .post(`/api/matches/${id}/scores`)
        .send({ playerId: 'luna', points: 1, extra: true })
        .expect(400);
      const messages = Array.isArray(extra.body.message) ? extra.body.message.join(' ') : String(extra.body.message);
      expect(messages).toContain('extra');
    } finally {
      socket.close();
    }
  });

  it('responde 400 e 404 quando o id não leva a uma rodada', async () => {
    await request(http()).get('/api/matches/nao-e-uuid').expect(400);
    await request(http()).get('/api/matches/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa').expect(404);
  });
});

async function waitFor(predicate: () => boolean): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > 3000) throw new Error('evento de WebSocket não chegou');
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
