-- Schema da rodada. A aplicação aplica este arquivo na subida quando
-- DB_AUTO_MIGRATE=true. Em produção isso seria uma migration antes do deploy.

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY,
  status VARCHAR(16) NOT NULL CHECK (status IN ('open', 'finished')),
  created_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ NULL,
  version INTEGER NOT NULL CHECK (version >= 1)
);

CREATE TABLE IF NOT EXISTS match_scores (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
  player_id VARCHAR(32) NOT NULL,
  points INTEGER NOT NULL CHECK (points >= 0),
  CONSTRAINT match_scores_player_unique UNIQUE (match_id, player_id)
);
