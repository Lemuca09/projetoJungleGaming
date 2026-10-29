import { loadConfig } from './load-config';

describe('loadConfig', () => {
  it('usa os defaults do banco local', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      database: {
        host: 'localhost',
        port: 5433,
        user: 'jungle',
        password: 'jungle',
        name: 'jungle_rounds',
        autoMigrate: true,
      },
      eventBus: 'local',
      awsRegion: undefined,
      sqsQueueUrl: undefined,
    });
  });

  it('aceita SQS só com região e URL https', () => {
    const config = loadConfig({
      EVENT_BUS: 'sqs',
      AWS_REGION: 'us-east-1',
      SQS_QUEUE_URL: 'https://sqs.us-east-1.amazonaws.com/123456789012/jungle-rounds',
      PORT: '3001',
      DB_AUTO_MIGRATE: 'false',
    });

    expect(config.eventBus).toBe('sqs');
    expect(config.port).toBe(3001);
    expect(config.database.autoMigrate).toBe(false);
    expect(config.sqsQueueUrl).toContain('jungle-rounds');
  });

  it.each([
    [{ EVENT_BUS: 'sns' }, 'EVENT_BUS'],
    [{ EVENT_BUS: 'sqs' }, 'AWS_REGION'],
    [{ EVENT_BUS: 'sqs', AWS_REGION: 'us-east-1' }, 'SQS_QUEUE_URL'],
    [{ EVENT_BUS: 'sqs', AWS_REGION: 'us-east-1', SQS_QUEUE_URL: 'http://localhost/fila' }, 'https'],
    [{ PORT: '0' }, 'PORT'],
    [{ DB_AUTO_MIGRATE: 'yes' }, 'DB_AUTO_MIGRATE'],
  ])('rejeita %j', (env, fragment) => {
    expect(() => loadConfig(env)).toThrow(fragment);
  });
});
