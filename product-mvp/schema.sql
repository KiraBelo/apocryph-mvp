-- ================================================================
-- Апокриф — схема базы данных
-- Запуск: psql -U postgres -d apocryph < schema.sql
-- Seed data: psql -U postgres -d apocryph < seed-dev.sql (DEV ONLY)
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── USERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  session_version INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── REQUESTS (заявки) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT,
  type          TEXT NOT NULL CHECK (type IN ('duo','multiplayer')),
  content_level TEXT NOT NULL CHECK (content_level IN ('none','rare','often','core','flexible')),
  fandom_type   TEXT NOT NULL DEFAULT 'original' CHECK (fandom_type IN ('fandom','original')),
  pairing       TEXT NOT NULL DEFAULT 'any' CHECK (pairing IN ('sl','fm','gt','any','multi','other')),
  tags          TEXT[] NOT NULL DEFAULT '{}',
  language      TEXT NOT NULL DEFAULT 'ru' CHECK (language IN ('ru','en')),
  is_public     BOOLEAN NOT NULL DEFAULT true,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','inactive')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Migration for existing databases (safe to re-run)
ALTER TABLE requests ADD COLUMN IF NOT EXISTS fandom_type TEXT NOT NULL DEFAULT 'original' CHECK (fandom_type IN ('fandom','original'));
ALTER TABLE requests ADD COLUMN IF NOT EXISTS pairing TEXT NOT NULL DEFAULT 'any' CHECK (pairing IN ('sl','fm','gt','any','multi','other'));
ALTER TABLE requests ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'ru' CHECK (language IN ('ru','en'));
-- Extend content_level and pairing constraints
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_content_level_check;
ALTER TABLE requests ADD CONSTRAINT requests_content_level_check CHECK (content_level IN ('none','rare','often','core','flexible'));
ALTER TABLE requests DROP CONSTRAINT IF EXISTS requests_pairing_check;
ALTER TABLE requests ADD CONSTRAINT requests_pairing_check CHECK (pairing IN ('sl','fm','gt','any','multi','other'));

-- ── GAMES (диалоги) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS games (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID REFERENCES requests(id) ON DELETE SET NULL,
  banner_url  TEXT,
  ooc_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── GAME PARTICIPANTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_participants (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname     TEXT NOT NULL DEFAULT 'Игрок',
  avatar_url   TEXT,
  left_at          TIMESTAMPTZ,
  leave_reason     TEXT,
  banner_url       TEXT,
  banner_pref      TEXT NOT NULL DEFAULT 'own',
  starred_at       TIMESTAMPTZ,
  hidden_at        TIMESTAMPTZ,
  last_read_at     TIMESTAMPTZ,
  last_read_ooc_at TIMESTAMPTZ,
  UNIQUE (game_id, user_id)
);

-- ── MESSAGES (посты) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id        UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES game_participants(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  type           TEXT NOT NULL DEFAULT 'ic',
  edited_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── BOOKMARKS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, request_id)
);

-- ── INVITES ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invites (
  token      TEXT PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at    TIMESTAMPTZ
);

-- Migration: invite expiration
ALTER TABLE invites ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
UPDATE invites SET expires_at = created_at + INTERVAL '7 days' WHERE expires_at IS NULL;

-- ── TAG BLACKLIST ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_tag_blacklist (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag     TEXT NOT NULL,
  PRIMARY KEY (user_id, tag)
);

-- ── GAME NOTES (личные заметки игрока) ───────────────────────────
CREATE TABLE IF NOT EXISTS game_notes (
  id         BIGSERIAL PRIMARY KEY,
  game_id    UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT '',
  content    TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
-- Migration for existing databases
ALTER TABLE game_notes ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_game_notes_game_user ON game_notes(game_id, user_id);

-- ── REPORTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved','dismissed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_game_reporter_pending
  ON reports (game_id, reporter_id) WHERE status = 'pending';

-- Migrations for banner preferences
-- ooc_enabled is now in CREATE TABLE with DEFAULT false
ALTER TABLE game_participants ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE game_participants ADD COLUMN IF NOT EXISTS banner_pref TEXT NOT NULL DEFAULT 'own' CHECK (banner_pref IN ('own','partner','none'));
ALTER TABLE game_participants ADD COLUMN IF NOT EXISTS starred_at TIMESTAMPTZ;
ALTER TABLE game_participants ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;
-- Колонка prepare_for_publish удалена в lifecycle v3 ниже (DROP COLUMN).
-- Не воссоздаём её при первом запуске schema.sql на чистой БД.

-- ── STRUCTURED TAGS (Фаза 3) ───────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS tags (
  id          SERIAL PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  category    TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('fandom','genre','trope','setting','character_type','pairing','mood','format','other')),
  parent_tag_id INTEGER REFERENCES tags(id) ON DELETE SET NULL,
  approved    BOOLEAN NOT NULL DEFAULT false,
  reviewed    BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tag_i18n (
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  lang    TEXT NOT NULL CHECK (lang IN ('ru','en','es','pt')),
  name    TEXT NOT NULL,
  PRIMARY KEY (tag_id, lang)
);

CREATE TABLE IF NOT EXISTS tag_aliases (
  id     SERIAL PRIMARY KEY,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  alias  TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS request_tags (
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (request_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tags_slug_trgm ON tags USING gin (slug gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tag_i18n_name_trgm ON tag_i18n USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tag_i18n_lang ON tag_i18n(lang);
CREATE INDEX IF NOT EXISTS idx_tag_aliases_alias_trgm ON tag_aliases USING gin (alias gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_request_tags_tag ON request_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_request_tags_request ON request_tags(request_id);
CREATE INDEX IF NOT EXISTS idx_tags_parent_tag_id ON tags(parent_tag_id) WHERE parent_tag_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count DESC);

-- Auto-approve trigger: 3+ uses → approved
CREATE OR REPLACE FUNCTION update_tag_usage() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
    UPDATE tags SET approved = true WHERE id = NEW.tag_id AND usage_count >= 3 AND approved = false;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags SET usage_count = GREATEST(0, usage_count - 1) WHERE id = OLD.tag_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_tag_usage ON request_tags;
CREATE TRIGGER trg_update_tag_usage
AFTER INSERT OR DELETE ON request_tags
FOR EACH ROW EXECUTE FUNCTION update_tag_usage();

-- ── TRIGGERS ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION lowercase_tags()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tags := array(SELECT lower(t) FROM unnest(NEW.tags) t);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_lowercase_tags
BEFORE INSERT OR UPDATE ON requests
FOR EACH ROW EXECUTE FUNCTION lowercase_tags();

-- ── INDEXES ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_requests_status  ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_type    ON requests(type);
CREATE INDEX IF NOT EXISTS idx_requests_content ON requests(content_level);
CREATE INDEX IF NOT EXISTS idx_messages_game    ON messages(game_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gp_user         ON game_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_gp_game         ON game_participants(game_id);
CREATE INDEX IF NOT EXISTS idx_games_request_id ON games(request_id);
CREATE INDEX IF NOT EXISTS idx_requests_author  ON requests(author_id);
CREATE INDEX IF NOT EXISTS idx_messages_participant ON messages(participant_id);

-- ── MODERATION (Фаза 4) ─────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user','moderator','admin'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- status is now in CREATE TABLE
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

ALTER TABLE games ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'visible'
  CHECK (moderation_status IN ('visible','hidden','under_review'));

-- ── GAME LIFECYCLE ───────────────────────────────────────────
ALTER TABLE games ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'preparing', 'moderation', 'published'));
-- Phase 4 cleanup: drop dead columns from removed 'finished' lifecycle
ALTER TABLE games DROP COLUMN IF EXISTS finished_at;
ALTER TABLE game_participants DROP COLUMN IF EXISTS finish_consent;
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

-- ── PUBLIC GAMES (Библиотека) ─────────────────────────────────
ALTER TABLE games ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_games_published ON games(published_at) WHERE published_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS game_publish_consent (
  game_id        UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES game_participants(id) ON DELETE CASCADE,
  consented      BOOLEAN NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (game_id, participant_id)
);

-- ── STOP-LIST PHRASES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stop_phrases (
  id          SERIAL PRIMARY KEY,
  phrase      TEXT NOT NULL,
  note        TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_stop_phrases_phrase
  ON stop_phrases (phrase) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS stop_violations (
  id              SERIAL PRIMARY KEY,
  game_id         UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phrase_id       INTEGER NOT NULL REFERENCES stop_phrases(id) ON DELETE CASCADE,
  matched_text    TEXT NOT NULL,
  message_type    TEXT NOT NULL DEFAULT 'ic',
  auto_hidden     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stop_violations_game ON stop_violations (game_id);
CREATE INDEX IF NOT EXISTS idx_stop_violations_created ON stop_violations (created_at DESC);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_messages_game_type ON messages(game_id, type, created_at);

-- ── NEW LIFECYCLE MIGRATION (v3) ─────────────────────────────
-- Update status constraint: remove 'finished', add 'preparing', 'moderation', 'published'
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_status_check;
ALTER TABLE games ADD CONSTRAINT games_status_check
  CHECK (status IN ('active', 'preparing', 'moderation', 'published'));
-- Migrate existing finished games → active
UPDATE games SET status = 'active' WHERE status = 'finished';
-- Per-participant prepare flag — устаревший, статус публикации теперь на уровне games.
-- DROP оставлен для миграции старых баз; в новых установках колонки нет (см. выше).
ALTER TABLE game_participants DROP COLUMN IF EXISTS prepare_for_publish;

-- ── GAME LIKES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id    UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_game_likes_game ON game_likes(game_id);

-- ── GAME COMMENTS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  parent_id   UUID REFERENCES game_comments(id) ON DELETE CASCADE,
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_game_comments_game ON game_comments(game_id, approved_at);

-- ── IN-APP NOTIFICATIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}',
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);

-- ── SESSION VERSIONING ───────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;

-- ── AUDIT: MISSING FK INDEXES ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_invites_request ON invites(request_id);
CREATE INDEX IF NOT EXISTS idx_stop_violations_user ON stop_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_game_comments_parent ON game_comments(parent_id) WHERE parent_id IS NOT NULL;

-- ── AUDIT: MISSING FILTERED INDEXES ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_gp_starred ON game_participants(game_id) WHERE starred_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gp_hidden ON game_participants(game_id) WHERE hidden_at IS NOT NULL;
