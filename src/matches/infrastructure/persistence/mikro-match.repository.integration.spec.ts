import { MikroORM } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import { loadConfig } from '../../../config/load-config';
import { ensureSchema } from '../../../database/ensure-schema';
import { mikroOptions } from '../../../database/mikro-options';
import { Match, PlayerId, ScorePoints } from '../../domain/match';
import { expectStaleWriteToFail } from '../../test-support/expect-stale-write-to-fail';
import { MikroMatchRepository } from './mikro-match.repository';

const run = process.env.RUN_DB_TESTS === '1';

(run ? describe : describe.skip)('MikroMatchRepository (PostgreSQL)', () => {
  let orm: MikroORM | undefined;
  let repo: MikroMatchRepository;

  beforeAll(async () => {
    const config = loadConfig(process.env);
    if (config.database.name !== 'jungle_rounds') {
      throw new Error('test:db só roda no banco jungle_rounds.');
    }
    orm = await MikroORM.init(mikroOptions(config));
    await ensureSchema(orm);
    repo = new MikroMatchRepository(orm);
  });

  afterEach(async () => {
    await orm?.em.fork().getConnection().execute('delete from matches');
  });

  afterAll(async () => {
    await orm?.close(true);
  });

  it('grava o total acumulado e devolve a mesma rodada', async () => {
    const match = Match.open(randomUUID(), new Date('2026-10-26T15:00:00.000Z'));
    await repo.save(match, null);

    const loaded = await repo.findById(match.id);
    if (!loaded) throw new Error('A rodada não foi lida.');
    expect(loaded.version).toBe(1);
    expect(loaded.match.toView().createdAt).toBe('2026-10-26T15:00:00.000Z');

    loaded.match.record(PlayerId.create('luna'), ScorePoints.create(10));
    await repo.save(loaded.match, loaded.version);

    const again = await repo.findById(match.id);
    if (!again) throw new Error('A rodada não foi lida.');
    again.match.record(PlayerId.create('luna'), ScorePoints.create(5));
    again.match.record(PlayerId.create('kael'), ScorePoints.create(5));
    await repo.save(again.match, again.version);

    const stored = await repo.findById(match.id);
    expect(stored?.version).toBe(3);
    expect(stored?.match.toView().scores).toEqual([
      { playerId: 'luna', points: 15, rank: 1 },
      { playerId: 'kael', points: 5, rank: 2 },
    ]);
  });

  it('recusa uma escrita que partiu de uma versão velha', async () => {
    await expectStaleWriteToFail(repo);
  });
});
