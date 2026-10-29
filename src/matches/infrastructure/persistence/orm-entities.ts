import { Entity, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/core';

@Entity({ tableName: 'matches' })
export class MatchOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'string', length: 16 })
  status!: 'open' | 'finished';

  @Property({ fieldName: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Property({ fieldName: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null = null;

  @Property({ type: 'integer' })
  version!: number;
}

@Entity({ tableName: 'match_scores' })
@Unique({ properties: ['match', 'playerId'], name: 'match_scores_player_unique' })
export class MatchScoreOrmEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => MatchOrmEntity, { fieldName: 'match_id', deleteRule: 'cascade' })
  match!: MatchOrmEntity;

  @Property({ fieldName: 'player_id', type: 'string', length: 32 })
  playerId!: string;

  @Property({ type: 'integer' })
  points!: number;
}
