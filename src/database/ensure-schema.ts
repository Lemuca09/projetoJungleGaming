import { MikroORM } from '@mikro-orm/core';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function splitSql(script: string): string[] {
  return script
    .split(';')
    .map((part) => part.trim())
    .filter((part) =>
      part.split(/\r?\n/).some((line) => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('--');
      }),
    );
}

export async function ensureSchema(orm: MikroORM): Promise<void> {
  const path = join(process.cwd(), 'db', 'init.sql');
  if (!existsSync(path)) throw new Error(`Não encontrei o schema em ${path}.`);
  const connection = orm.em.fork().getConnection();
  for (const statement of splitSql(readFileSync(path, 'utf8'))) {
    await connection.execute(statement);
  }
}
