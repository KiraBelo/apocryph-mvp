-- ================================================================
-- seed-publish-requests.sql
-- Убрать "замороженные" игры Луны + добавить 5 игр, где соигрок
-- уже дал согласие на публикацию
-- Run: psql -U postgres -d apocryph < seed-publish-requests.sql
-- ================================================================

-- 1. Удалить игры Луны с замороженным IC (preparing / moderation)
DELETE FROM games
WHERE id IN (
  SELECT gp.game_id
  FROM game_participants gp
  JOIN games g ON g.id = gp.game_id
  WHERE gp.user_id = '11111111-1111-1111-1111-111111111111'
    AND g.status IN ('preparing', 'moderation')
);

-- ================================================================
-- 5 новых игр: статус active, соигрок уже дал consent на публикацию
-- ================================================================

-- ── Игра 1: "Зеркало и тень" — luna vs wolf ─────────────────────
INSERT INTO games (id, request_id, status, created_at) VALUES (
  'ee000001-0000-0000-0000-000000000001',
  NULL,
  'active',
  NOW() - INTERVAL '21 days'
) ON CONFLICT DO NOTHING;

INSERT INTO game_participants (id, game_id, user_id, nickname) VALUES
  ('eea00001-0000-0000-0000-000000000001',
   'ee000001-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', 'Мира'),
  ('eeb00001-0000-0000-0000-000000000001',
   'ee000001-0000-0000-0000-000000000001',
   '22222222-2222-2222-2222-222222222222', 'Граф Нолан')
ON CONFLICT DO NOTHING;

INSERT INTO messages (game_id, participant_id, content, type, created_at)
SELECT
  'ee000001-0000-0000-0000-000000000001'::uuid,
  CASE WHEN n % 2 = 1
    THEN 'eea00001-0000-0000-0000-000000000001'::uuid
    ELSE 'eeb00001-0000-0000-0000-000000000001'::uuid
  END,
  CASE WHEN n % 2 = 1
    THEN '<p>Мира подошла к зеркалу в дальнем конце галереи. Рама была старше дома — тёмное дерево, сплошь резьба с переплетёнными лилиями и черепами. Отражение смотрело верно, но с опозданием на секунду. Ровно на секунду.</p>'
    ELSE '<p>— Оно всегда так, — сказал Граф Нолан из-за её спины. Голос ровный, как будто запаздывающие отражения были в этом доме в порядке вещей. — С тех пор как оно вернулось из Флоренции. Хотите знать, что там видят другие?</p>'
  END,
  'ic',
  NOW() - INTERVAL '21 days' + (n * INTERVAL '3 hours')
FROM generate_series(1, 22) AS n
ON CONFLICT DO NOTHING;

-- consent от wolf (соигрок готов к публикации)
INSERT INTO game_publish_consent (game_id, participant_id, consented, created_at) VALUES (
  'ee000001-0000-0000-0000-000000000001',
  'eeb00001-0000-0000-0000-000000000001',
  true,
  NOW() - INTERVAL '2 hours'
) ON CONFLICT DO NOTHING;

-- ── Игра 2: "Тридцать шагов до рассвета" — luna vs ember ─────────
INSERT INTO games (id, request_id, status, created_at) VALUES (
  'ee000001-0000-0000-0000-000000000002',
  NULL,
  'active',
  NOW() - INTERVAL '31 days'
) ON CONFLICT DO NOTHING;

INSERT INTO game_participants (id, game_id, user_id, nickname) VALUES
  ('eea00001-0000-0000-0000-000000000002',
   'ee000001-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111111', 'Лейтенант Ариэль'),
  ('eeb00001-0000-0000-0000-000000000002',
   'ee000001-0000-0000-0000-000000000002',
   '33333333-3333-3333-3333-333333333333', 'Командор Веск')
ON CONFLICT DO NOTHING;

INSERT INTO messages (game_id, participant_id, content, type, created_at)
SELECT
  'ee000001-0000-0000-0000-000000000002'::uuid,
  CASE WHEN n % 2 = 1
    THEN 'eea00001-0000-0000-0000-000000000002'::uuid
    ELSE 'eeb00001-0000-0000-0000-000000000002'::uuid
  END,
  CASE WHEN n % 2 = 1
    THEN '<p>Ариэль нашла его карту на полу рубки. Маршрут нарисован от руки, красными чернилами — тридцать точек, тридцать шагов, и последняя отмечена крестом так яростно, что перо пробило бумагу. Она не слышала, как вошёл Командор.</p>'
    ELSE '<p>— Это не ваше, лейтенант, — сказал Веск. Без злости. Без тепла. Он забрал карту двумя пальцами и сложил её вчетверо с безупречной точностью. — Но раз вы уже видели — садитесь. Я объясню только один раз.</p>'
  END,
  'ic',
  NOW() - INTERVAL '31 days' + (n * INTERVAL '4 hours')
FROM generate_series(1, 24) AS n
ON CONFLICT DO NOTHING;

-- consent от ember
INSERT INTO game_publish_consent (game_id, participant_id, consented, created_at) VALUES (
  'ee000001-0000-0000-0000-000000000002',
  'eeb00001-0000-0000-0000-000000000002',
  true,
  NOW() - INTERVAL '5 hours'
) ON CONFLICT DO NOTHING;

-- ── Игра 3: "Последний экспонат" — luna vs starfall ──────────────
INSERT INTO games (id, request_id, status, created_at) VALUES (
  'ee000001-0000-0000-0000-000000000003',
  NULL,
  'active',
  NOW() - INTERVAL '18 days'
) ON CONFLICT DO NOTHING;

INSERT INTO game_participants (id, game_id, user_id, nickname) VALUES
  ('eea00001-0000-0000-0000-000000000003',
   'ee000001-0000-0000-0000-000000000003',
   '11111111-1111-1111-1111-111111111111', 'Доктор Эсме'),
  ('eeb00001-0000-0000-0000-000000000003',
   'ee000001-0000-0000-0000-000000000003',
   '44444444-4444-4444-4444-444444444444', 'Реставратор')
ON CONFLICT DO NOTHING;

INSERT INTO messages (game_id, participant_id, content, type, created_at)
SELECT
  'ee000001-0000-0000-0000-000000000003'::uuid,
  CASE WHEN n % 2 = 1
    THEN 'eea00001-0000-0000-0000-000000000003'::uuid
    ELSE 'eeb00001-0000-0000-0000-000000000003'::uuid
  END,
  CASE WHEN n % 2 = 1
    THEN '<p>Музей закрывался через час, но Эсме не уходила. Она изучала последний экспонат зала — маленькую деревянную шкатулку без таблички, без инвентарного номера. Просто стояла за стеклом и ждала, когда её наконец спросят.</p>'
    ELSE '<p>— Её нашли в запасниках три года назад, — Реставратор подошёл тихо, как умеют только люди, привыкшие работать в тишине. — Все думали — мусор. Я думал иначе. Замок на ней не открывался никогда. До вас.</p>'
  END,
  'ic',
  NOW() - INTERVAL '18 days' + (n * INTERVAL '5 hours')
FROM generate_series(1, 20) AS n
ON CONFLICT DO NOTHING;

-- consent от starfall
INSERT INTO game_publish_consent (game_id, participant_id, consented, created_at) VALUES (
  'ee000001-0000-0000-0000-000000000003',
  'eeb00001-0000-0000-0000-000000000003',
  true,
  NOW() - INTERVAL '1 day'
) ON CONFLICT DO NOTHING;

-- ── Игра 4: "Соль и порох" — luna vs wolf ────────────────────────
INSERT INTO games (id, request_id, status, created_at) VALUES (
  'ee000001-0000-0000-0000-000000000004',
  NULL,
  'active',
  NOW() - INTERVAL '40 days'
) ON CONFLICT DO NOTHING;

INSERT INTO game_participants (id, game_id, user_id, nickname) VALUES
  ('eea00001-0000-0000-0000-000000000004',
   'ee000001-0000-0000-0000-000000000004',
   '11111111-1111-1111-1111-111111111111', 'Контрабандистка Зейн'),
  ('eeb00001-0000-0000-0000-000000000004',
   'ee000001-0000-0000-0000-000000000004',
   '22222222-2222-2222-2222-222222222222', 'Портовый инспектор')
ON CONFLICT DO NOTHING;

INSERT INTO messages (game_id, participant_id, content, type, created_at)
SELECT
  'ee000001-0000-0000-0000-000000000004'::uuid,
  CASE WHEN n % 2 = 1
    THEN 'eea00001-0000-0000-0000-000000000004'::uuid
    ELSE 'eeb00001-0000-0000-0000-000000000004'::uuid
  END,
  CASE WHEN n % 2 = 1
    THEN '<p>Зейн поставила ящик на весы раньше, чем таможенник успел поднять голову. Груз был задекларирован как соль. Он был солью — если не считать того, что лежало под третьим слоем.</p>'
    ELSE '<p>Инспектор поднял голову. Посмотрел на ящик. Посмотрел на неё. Потом снова на ящик — с тем особым выражением, с которым опытные таможенники смотрят на вещи, которые слишком правильно выглядят.</p><p>— Соль, значит.</p>'
  END,
  'ic',
  NOW() - INTERVAL '40 days' + (n * INTERVAL '6 hours')
FROM generate_series(1, 26) AS n
ON CONFLICT DO NOTHING;

-- consent от wolf
INSERT INTO game_publish_consent (game_id, participant_id, consented, created_at) VALUES (
  'ee000001-0000-0000-0000-000000000004',
  'eeb00001-0000-0000-0000-000000000004',
  true,
  NOW() - INTERVAL '3 hours'
) ON CONFLICT DO NOTHING;

-- ── Игра 5: "Два голоса, одна песня" — luna vs ember ─────────────
INSERT INTO games (id, request_id, status, created_at) VALUES (
  'ee000001-0000-0000-0000-000000000005',
  NULL,
  'active',
  NOW() - INTERVAL '27 days'
) ON CONFLICT DO NOTHING;

INSERT INTO game_participants (id, game_id, user_id, nickname) VALUES
  ('eea00001-0000-0000-0000-000000000005',
   'ee000001-0000-0000-0000-000000000005',
   '11111111-1111-1111-1111-111111111111', 'Скрипачка'),
  ('eeb00001-0000-0000-0000-000000000005',
   'ee000001-0000-0000-0000-000000000005',
   '33333333-3333-3333-3333-333333333333', 'Пианист')
ON CONFLICT DO NOTHING;

INSERT INTO messages (game_id, participant_id, content, type, created_at)
SELECT
  'ee000001-0000-0000-0000-000000000005'::uuid,
  CASE WHEN n % 2 = 1
    THEN 'eea00001-0000-0000-0000-000000000005'::uuid
    ELSE 'eeb00001-0000-0000-0000-000000000005'::uuid
  END,
  CASE WHEN n % 2 = 1
    THEN '<p>Они репетировали сонату уже четыре часа. Скрипачка опустила смычок и сказала в третий раз: — Здесь должна быть пауза. Не потому что я устала — потому что это <em>тишина</em>, а ты её каждый раз заполняешь.</p>'
    ELSE '<p>Пианист не ответил сразу. Его пальцы прошлись по клавишам вхолостую — беззвучно, как черновик. Потом он сказал: — Я заполняю её, потому что боюсь, что ты не придёшь после. Что это и есть конец.</p>'
  END,
  'ic',
  NOW() - INTERVAL '27 days' + (n * INTERVAL '4 hours')
FROM generate_series(1, 22) AS n
ON CONFLICT DO NOTHING;

-- consent от ember
INSERT INTO game_publish_consent (game_id, participant_id, consented, created_at) VALUES (
  'ee000001-0000-0000-0000-000000000005',
  'eeb00001-0000-0000-0000-000000000005',
  true,
  NOW() - INTERVAL '6 hours'
) ON CONFLICT DO NOTHING;
