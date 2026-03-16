-- ================================================================
-- Апокриф — схема базы данных + seed data
-- Запуск: psql -U postgres -d apocryph < schema.sql
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── USERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
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
  is_public     BOOLEAN NOT NULL DEFAULT true,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','inactive')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Migration for existing databases (safe to re-run)
ALTER TABLE requests ADD COLUMN IF NOT EXISTS fandom_type TEXT NOT NULL DEFAULT 'original' CHECK (fandom_type IN ('fandom','original'));
ALTER TABLE requests ADD COLUMN IF NOT EXISTS pairing TEXT NOT NULL DEFAULT 'any' CHECK (pairing IN ('sl','fm','gt','any','multi','other'));
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
  CHECK (status IN ('active', 'finished'));
ALTER TABLE games ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
ALTER TABLE game_participants ADD COLUMN IF NOT EXISTS finish_consent BOOLEAN DEFAULT false;
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

-- ================================================================
-- SEED DATA — 16 заявок для холодного старта
-- Пароль для всех seed-пользователей: apocryph123
-- bcrypt hash of 'apocryph123' with 10 rounds
-- ================================================================

INSERT INTO users (id, email, password_hash) VALUES
  ('11111111-1111-1111-1111-111111111111', 'luna@apocryph.test',   '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FCtAtmNU5.aMdqspmHSNxL0/xUKv8Vy'),
  ('22222222-2222-2222-2222-222222222222', 'wolf@apocryph.test',   '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FCtAtmNU5.aMdqspmHSNxL0/xUKv8Vy'),
  ('33333333-3333-3333-3333-333333333333', 'ember@apocryph.test',  '$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FCtAtmNU5.aMdqspmHSNxL0/xUKv8Vy'),
  ('44444444-4444-4444-4444-444444444444', 'starfall@apocryph.test','$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FCtAtmNU5.aMdqspmHSNxL0/xUKv8Vy')
ON CONFLICT DO NOTHING;

INSERT INTO requests (author_id, title, body, type, content_level, fandom_type, pairing, tags, is_public, status) VALUES

-- Фандом
('11111111-1111-1111-1111-111111111111',
 'Детективное AU — Шерлок/Ватсон',
 '<p>Ищу партнёра для игры в <strong>детективном AU</strong>. Хочу исследовать динамику Шерлок/Ватсон в современном Лондоне. Готова играть обоих по очереди или одного.</p><p>Темп — без спешки, жду вдумчивых постов. Приветствуется атмосфера и внимание к деталям.</p>',
 'duo', 'none', 'fandom', 'gt', ARRAY['Шерлок','BBC','детектив','AU','флафф'], true, 'active'),

('22222222-2222-2222-2222-222222222222',
 'Ведьмак — after canon, что было дальше?',
 '<p>После финала третьего сезона не могу отпустить историю. Хочу исследовать, что происходит после.</p><p>Готов играть Геральта или OC. Ищу партнёра на <em>Цирилью или Йеннифэр</em>.</p>',
 'duo', 'rare', 'fandom', 'gt', ARRAY['Ведьмак','Геральт','после канона','адвенчур'], true, 'active'),

('33333333-3333-3333-3333-333333333333',
 'Genshin Impact — мультиплеер-квест',
 '<p>Собираю группу для исследования Тейвата в текстовом формате. Играем в своих OC или канонных персонажей.</p><p>Мульт, поэтому место для нескольких! Открыт набор.</p>',
 'multiplayer', 'none', 'fandom', 'any', ARRAY['Genshin','фэнтези','приключение','OC','группа'], true, 'active'),

('44444444-4444-4444-4444-444444444444',
 'Апокалипсис — выжившие. Дуэт.',
 '<p>Постапокалиптика, двое выживших в мире, который рухнул три года назад. Не романтика в центре — но если вырастет, не против.</p><p>Хочу медленное развитие характеров, моральные дилеммы, настоящую дружбу под давлением обстоятельств.</p>',
 'duo', 'rare', 'original', 'any', ARRAY['постапок','выживание','оригинал','медленный бёрн'], true, 'active'),

-- Оригинальные
('11111111-1111-1111-1111-111111111111',
 'Академия магии — первый год',
 '<p>Классика: академия магии, первый год, новые знакомства. Ищу партнёра для совместного строительства мира и персонажей.</p><p>Оригинальная вселенная, придумываем вместе. Никакого гарри поттера — своё.</p>',
 'duo', 'none', 'original', 'any', ARRAY['магия','академия','оригинал','фэнтези','флафф'], true, 'active'),

('22222222-2222-2222-2222-222222222222',
 'Корпоративный триллер — кто предал?',
 '<p>Современный детектив внутри крупной корпорации. Утечка данных, внутренние расследования, доверие под вопросом.</p><p>Хочу напряжённую атмосферу и неоднозначных персонажей. Романтика не обязательна.</p>',
 'duo', 'rare', 'original', 'any', ARRAY['детектив','современность','оригинал','интрига','триллер'], true, 'active'),

('33333333-3333-3333-3333-333333333333',
 'Вампиры в современном городе — медленный бёрн',
 '<p>Ищу партнёра для игры про вампира и человека. Классическая динамика, но хочу сделать её глубже и менее романтизированной.</p><p>Медленный бёрн, сложные отношения, философские вопросы о смертности.</p>',
 'duo', 'often', 'original', 'gt', ARRAY['вампиры','городское фэнтези','оригинал','медленный бёрн','ужас'], true, 'active'),

('44444444-4444-4444-4444-444444444444',
 'Космическая станция — последние дни',
 '<p>На станции что-то пошло не так. Двое остались. Связь с Землёй потеряна.</p><p>Хочу исследовать изоляцию, страх и человеческую связь в экстремальных условиях. Sci-fi, оригинальные персонажи.</p>',
 'duo', 'rare', 'original', 'any', ARRAY['sci-fi','выживание','психология','оригинал','изоляция'], true, 'active'),

-- Быстрые сцены / одиночные
('11111111-1111-1111-1111-111111111111',
 'Одна сцена: встреча врагов спустя годы',
 '<p>Хочу отыграть именно эту сцену — <em>enemies to lovers</em>, встреча после многолетней разлуки. Можем придумать предысторию вместе или я набросаю.</p><p>Одна встреча, одна сцена, конец истории. Никаких долгосрочных обязательств.</p>',
 'duo', 'rare', 'original', 'gt', ARRAY['короткая игра','enemies to lovers','одна сцена','романтика'], true, 'active'),

('22222222-2222-2222-2222-222222222222',
 'Мир Стар Варс — Орден 66, два выживших падавана',
 '<p>Хочу исследовать один из самых болезненных моментов лора. Два падавана, которым удалось выжить, находят друг друга.</p>',
 'duo', 'rare', 'fandom', 'sl', ARRAY['Star Wars','фандом','орден 66','ангст','выживание'], true, 'active'),

('33333333-3333-3333-3333-333333333333',
 'Наруто — Акацуки, пропавшие ниндзя',
 '<p>Хочу исследовать жизнь персонажей до вступления в Акацуки. Что привело их туда? OC или канон — договоримся.</p>',
 'duo', 'rare', 'fandom', 'any', ARRAY['Наруто','Акацуки','предыстория','ангст','фандом'], true, 'active'),

('44444444-4444-4444-4444-444444444444',
 'Фэнтези — торговый путь через проклятый лес',
 '<p>Двое путников, торговый маршрут, лес с нехорошей репутацией. Что пошло не так — решим по ходу.</p><p>Легко, атмосферно, без тяжёлой предыстории. Хочу поиграть в приключение.</p>',
 'duo', 'none', 'original', 'any', ARRAY['фэнтези','приключение','короткая игра','оригинал'], true, 'active'),

-- Мультиплеер
('11111111-1111-1111-1111-111111111111',
 'Таверна у дороги — открытый мультиплеер',
 '<p>Классическое место встречи: таверна. Каждый играет своего персонажа. Можно приходить и уходить когда угодно.</p><p>Открытый набор, расслабленная атмосфера, никакого обязательного сюжета.</p>',
 'multiplayer', 'none', 'original', 'any', ARRAY['таверна','мультиплеер','фэнтези','расслабленная','OC'], true, 'active'),

('22222222-2222-2222-2222-222222222222',
 'Отряд наёмников — ищем 3-4 участников',
 '<p>Формируем отряд наёмников в фэнтези-мире. У нас уже есть следопыт и маг. Нужны другие роли.</p><p>Будет активный сюжет, общие квесты и место для личных арок.</p>',
 'multiplayer', 'rare', 'original', 'any', ARRAY['фэнтези','мультиплеер','наёмники','приключение','сюжет'], true, 'active'),

('33333333-3333-3333-3333-333333333333',
 'Аниме клуб после занятий — слайс оф лайф',
 '<p>Школьный клуб, современность, обычная жизнь. Хочу лёгкую игру без драмы и ставок — просто персонажи, которые существуют рядом.</p>',
 'multiplayer', 'none', 'fandom', 'any', ARRAY['современность','школа','слайс оф лайф','лёгкая','мультиплеер'], true, 'active'),

('44444444-4444-4444-4444-444444444444',
 'Детективное агентство — все мы немного сломаны',
 '<p>Частное детективное агентство, современность. Каждый персонаж пришёл сюда со своим грузом. Случайные дела, непростые клиенты.</p><p>Ищу 2-3 партнёров. Готова быть мастером или играть наравне.</p>',
 'multiplayer', 'rare', 'original', 'any', ARRAY['детектив','современность','мультиплеер','психология','оригинал'], true, 'active')

ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_messages_game_type ON messages(game_id, type, created_at);

-- Seed: luna = admin
UPDATE users SET role = 'admin' WHERE email = 'luna@apocryph.test';
