import { Options } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { AppConfig } from '../config/app-config';
import { MatchOrmEntity, MatchScoreOrmEntity } from '../matches/infrastructure/persistence/orm-entities';

export function mikroOptions(config: AppConfig): Options<PostgreSqlDriver> {
  return {
    driver: PostgreSqlDriver,
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    dbName: config.database.name,
    entities: [MatchOrmEntity, MatchScoreOrmEntity],
    allowGlobalContext: false,
  };
}
