import { AppConfig } from './app-config';

function text(env: NodeJS.ProcessEnv, key: string, fallback?: string): string {
  const raw = env[key];
  if (raw === undefined || raw.trim() === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`${key} é obrigatório.`);
  }
  return raw.trim();
}

function integer(env: NodeJS.ProcessEnv, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${key} deve ser um inteiro positivo.`);
  }
  return value;
}

function flag(env: NodeJS.ProcessEnv, key: string, fallback: boolean): boolean {
  const raw = env[key];
  if (raw === undefined || raw.trim() === '') return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`${key} deve ser true ou false.`);
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const eventBus = text(env, 'EVENT_BUS', 'local');
  if (eventBus !== 'local' && eventBus !== 'sqs') {
    throw new Error('EVENT_BUS deve ser local ou sqs.');
  }

  const awsRegion = env.AWS_REGION?.trim() || undefined;
  const sqsQueueUrl = env.SQS_QUEUE_URL?.trim() || undefined;

  if (eventBus === 'sqs') {
    if (!awsRegion) throw new Error('AWS_REGION é obrigatório quando EVENT_BUS=sqs.');
    if (!sqsQueueUrl) throw new Error('SQS_QUEUE_URL é obrigatório quando EVENT_BUS=sqs.');
    let parsed: URL;
    try {
      parsed = new URL(sqsQueueUrl);
    } catch {
      throw new Error('SQS_QUEUE_URL deve ser uma URL https.');
    }
    if (parsed.protocol !== 'https:') {
      throw new Error('SQS_QUEUE_URL deve ser uma URL https.');
    }
  }

  return {
    port: integer(env, 'PORT', 3000),
    database: {
      host: text(env, 'DB_HOST', 'localhost'),
      port: integer(env, 'DB_PORT', 5433),
      user: text(env, 'DB_USER', 'jungle'),
      password: text(env, 'DB_PASSWORD', 'jungle'),
      name: text(env, 'DB_NAME', 'jungle_rounds'),
      autoMigrate: flag(env, 'DB_AUTO_MIGRATE', true),
    },
    eventBus,
    awsRegion,
    sqsQueueUrl,
  };
}
