import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { splitSql } from './ensure-schema';

describe('splitSql', () => {
  it('ignora arquivo que só tem comentário', () => {
    expect(splitSql('-- nada aqui\n')).toEqual([]);
  });

  it('separa o schema versionado em dois comandos', () => {
    const statements = splitSql(readFileSync(join(process.cwd(), 'db', 'init.sql'), 'utf8'));
    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain('CREATE TABLE IF NOT EXISTS matches');
    expect(statements[1]).toContain('CREATE TABLE IF NOT EXISTS match_scores');
    expect(statements[1]).toContain('REFERENCES matches');
  });
});
