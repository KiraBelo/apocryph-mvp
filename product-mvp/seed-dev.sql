-- ================================================================
-- DEV ONLY: Do not apply to production!
-- Test seed data for local development.
-- Usage: psql -U postgres -d apocryph < seed-dev.sql
-- Requires schema.sql to be applied first.
-- Seed users: luna/wolf/ember/starfall@apocryph.test, password: apocryph123
-- ================================================================

INSERT INTO users (id, email, password_hash) VALUES
  ('11111111-1111-1111-1111-111111111111', 'luna@apocryph.test',   '$2b$10$LJujy1aUfL4B1AfUT1hGvO7w01xomCAu4HDOqcqwrwRX289NALe0O'),
  ('22222222-2222-2222-2222-222222222222', 'wolf@apocryph.test',   '$2b$10$LJujy1aUfL4B1AfUT1hGvO7w01xomCAu4HDOqcqwrwRX289NALe0O'),
  ('33333333-3333-3333-3333-333333333333', 'ember@apocryph.test',  '$2b$10$LJujy1aUfL4B1AfUT1hGvO7w01xomCAu4HDOqcqwrwRX289NALe0O'),
  ('44444444-4444-4444-4444-444444444444', 'starfall@apocryph.test','$2b$10$LJujy1aUfL4B1AfUT1hGvO7w01xomCAu4HDOqcqwrwRX289NALe0O')
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Clean old data
DELETE FROM messages;
DELETE FROM game_participants;
DELETE FROM games;
DELETE FROM bookmarks;
DELETE FROM invites;
DELETE FROM request_tags;
DELETE FROM requests;

-- ── Luna: 2 requests ────────────────────────────────────────────

-- Luna #1: duo, fandom, длинный текст
INSERT INTO requests (author_id, title, body, type, content_level, fandom_type, pairing, language, tags, is_public, status) VALUES
('11111111-1111-1111-1111-111111111111',
 'Город, которого нет на карте',
 '<p>Он приехал в этот город по работе — каталогизировать архив старой библиотеки перед сносом здания. Она живёт здесь всю жизнь и знает каждый переулок, каждую трещину в стенах. Город странный: улицы меняют направление после дождя, дома иногда исчезают на рассвете, а в подвале библиотеки кто-то оставляет записки, датированные будущим.</p><p>Ищу партнёра на неспешную, атмосферную игру. Много городских деталей, диалогов, постепенного раскрытия тайн. Хотелось бы, чтобы мистика оставалась на периферии — не в центре, а как фон, который постепенно проступает. Персонажи важнее сюжета. Готова играть за неё, но могу обсудить и другой расклад.</p><p>Темп свободный, пишу раз в пару дней, иногда чаще. Пост от абзаца до страницы — зависит от сцены. Не люблю когда всё превращается в бесконечные описания без движения.</p>',
 'duo', 'rare', 'original', 'gt', 'ru',
 ARRAY['городское фэнтези','мистика','slow burn','атмосфера','диалоги','оригинальные персонажи','библиотека','неспешная игра'],
 true, 'active');

-- Luna #2: multiplayer, original, короткий текст
INSERT INTO requests (author_id, title, body, type, content_level, fandom_type, pairing, language, tags, is_public, status) VALUES
('11111111-1111-1111-1111-111111111111',
 'Таверна на перекрёстке — открытый сбор',
 '<p>Таверна у дороги, место где пересекаются пути. Каждый играет своего персонажа, можно приходить и уходить. Без обязательного сюжета — просто хорошая компания и атмосфера.</p>',
 'multiplayer', 'none', 'original', 'any', 'ru',
 ARRAY['фэнтези','таверна','открытый мир','мультиплеер','OC','расслабленная','импровизация','песочница','без сюжета'],
 true, 'active');

-- ── Wolf: 2 requests ────────────────────────────────────────────

-- Wolf #1: duo, fandom, длинный текст
INSERT INTO requests (author_id, title, body, type, content_level, fandom_type, pairing, language, tags, is_public, status) VALUES
('22222222-2222-2222-2222-222222222222',
 'Хогвартс: тёмный семестр',
 '<p>Альтернативная вселенная, где Волдеморт победил в первой войне. Хогвартс остался, но теперь это совсем другая школа — с комендантским часом, доносами и тайной библиотекой запрещённых заклинаний в подземельях.</p><p>Группа студентов разных факультетов вынуждена объединиться, когда один из них находит дневник, который не должен существовать. Дневник принадлежал ученику, исчезнувшему двадцать лет назад, — и последние записи в нём появляются каждую ночь.</p><p>Ищу партнёра, который готов строить мир вместе. У меня есть каркас AU, но я хочу, чтобы мы оба вкладывались в детали. Готов играть одного или двух персонажей, канонных или OC. Главное — чтобы чувствовалась тяжесть мира и надежда вопреки.</p>',
 'duo', 'often', 'fandom', 'sl', 'ru',
 ARRAY['harry potter','hogwarts','dark academia','AU','enemies to lovers','ангст','магия','тайны','мрачное'],
 true, 'active');

-- Wolf #2: duo, original, короткий текст
INSERT INTO requests (author_id, title, body, type, content_level, fandom_type, pairing, language, tags, is_public, status) VALUES
('22222222-2222-2222-2222-222222222222',
 'Последнее письмо с маяка',
 '<p>Два смотрителя маяка на краю света. Один сменяет другого, и они никогда не встречаются лицом к лицу — только записки в журнале дежурств, оставленные вещи и странные совпадения.</p>',
 'duo', 'none', 'original', 'any', 'ru',
 ARRAY['драма','эпистолярный','изоляция','оригинальные персонажи','психология','медленный бёрн','маяк'],
 true, 'active');

-- ── Ember: 2 requests ───────────────────────────────────────────

-- Ember #1: multiplayer, fandom, длинный текст
INSERT INTO requests (author_id, title, body, type, content_level, fandom_type, pairing, language, tags, is_public, status) VALUES
('33333333-3333-3333-3333-333333333333',
 'Средиземье: странники Четвёртой Эпохи',
 '<p>Война Кольца закончена. Эльфы уходят, гномы замыкаются, а люди наследуют мир, к которому не готовы. По дорогам бродят те, кто не нашёл себя в новом порядке — бывшие солдаты, потерявшие дом, искатели забытых мест.</p><p>Хочу собрать группу из 3-4 игроков. Путешествие из Бри к восточным землям, о которых Толкин почти не писал — а значит, есть простор для фантазии. Каноничная атмосфера важна, но не фанатичное следование лору. Важнее персонажи и их истории.</p><p>У меня готов маршрут и несколько ключевых точек. Темп — пост раз в 2-3 дня от каждого. Мастерить буду сама, но если кто-то хочет подхватить NPC или локации — буду только рада.</p>',
 'multiplayer', 'rare', 'fandom', 'any', 'ru',
 ARRAY['tolkien','средиземье','приключение','путешествие','группа','четвёртая эпоха','мастеринг','OC'],
 true, 'active');

-- Ember #2: duo, original, короткий текст
INSERT INTO requests (author_id, title, body, type, content_level, fandom_type, pairing, language, tags, is_public, status) VALUES
('33333333-3333-3333-3333-333333333333',
 'Чернила на полях',
 '<p>В антикварной лавке появляется книга без обложки. На её полях — чьи-то пометки, всё более личные, всё более странные. Два человека начинают переписку через эти поля, не зная друг друга.</p>',
 'duo', 'none', 'original', 'gt', 'ru',
 ARRAY['мистика','книги','эпистолярный','романтика','антиквариат','городское фэнтези','slow burn','загадка','уютное'],
 true, 'active');

-- ── Starfall: 2 requests ────────────────────────────────────────

-- Starfall #1: duo, original, длинный текст
INSERT INTO requests (author_id, title, body, type, content_level, fandom_type, pairing, language, tags, is_public, status) VALUES
('44444444-4444-4444-4444-444444444444',
 'Станция «Предел» — 400 дней до связи',
 '<p>Орбитальная станция на краю Солнечной системы. Экипаж из двух человек, задача — поддерживать ретрансляторы. Связь с Землёй — раз в 400 дней, когда орбита позволяет. Остальное время — тишина, рутина и друг друг.</p><p>Что-то начинает идти не так на 312-й день. Мелочи: вещи не на своих местах, показания приборов, которые не сходятся, звуки в отсеках, где никого нет. Не хоррор — скорее тихое нарастание тревоги. Может, дело в изоляции. Может, нет.</p><p>Ищу партнёра для камерной, психологической игры. Два персонажа, замкнутое пространство, много внутренних монологов и деталей быта. Пишу длинно, ценю когда партнёр тоже вкладывается в описания.</p>',
 'duo', 'rare', 'original', 'any', 'ru',
 ARRAY['sci-fi','космос','изоляция','психология','триллер','оригинальные персонажи','камерная','медленный бёрн','тревога'],
 true, 'active');

-- Starfall #2: duo, fandom, короткий текст
INSERT INTO requests (author_id, title, body, type, content_level, fandom_type, pairing, language, tags, is_public, status) VALUES
('44444444-4444-4444-4444-444444444444',
 'Мир Стар Варс — два падавана после Ордена 66',
 '<p>Два падавана, которым удалось выжить после приказа 66, находят друг друга в разрушенном храме. Впереди — бегство, недоверие и вопрос: что значит быть джедаем, когда Ордена больше нет?</p>',
 'duo', 'rare', 'fandom', 'sl', 'ru',
 ARRAY['star wars','орден 66','ангст','выживание','джедаи','фандом','после канона'],
 true, 'active');

-- ══════════════════════════════════════════════════════════════════
-- Luna's games ready for publication (both partners agreed)
-- ══════════════════════════════════════════════════════════════════

-- Game 1: Luna + Wolf — "Город, которого нет на карте" (published)
INSERT INTO games (id, request_id, ooc_enabled, status, published_at)
SELECT 'aaaa1111-1111-1111-1111-111111111111',
       r.id, true, 'published', NOW()
FROM requests r WHERE r.title = 'Город, которого нет на карте'
ON CONFLICT DO NOTHING;

INSERT INTO game_participants (id, game_id, user_id, nickname, avatar_url) VALUES
  ('bb111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111', 'Алиса', NULL),
  ('bb111111-2222-2222-2222-222222222222', 'aaaa1111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222', 'Архивист', NULL)
ON CONFLICT DO NOTHING;

-- 25 IC messages alternating between participants
INSERT INTO messages (game_id, participant_id, content, type, created_at)
SELECT 'aaaa1111-1111-1111-1111-111111111111',
  CASE WHEN i % 2 = 1
    THEN 'bb111111-1111-1111-1111-111111111111'::uuid
    ELSE 'bb111111-2222-2222-2222-222222222222'::uuid
  END,
  CASE (i % 5)
    WHEN 0 THEN '<p>Библиотека встретила его тишиной — не уютной, а какой-то выжидающей, словно старое здание присматривалось к новому гостю.</p>'
    WHEN 1 THEN '<p>Она стояла у окна второго этажа и смотрела, как он выходит из такси. Ещё один приезжий, который думает, что всё здесь можно каталогизировать.</p>'
    WHEN 2 THEN '<p>Каталожные карточки в ящиках были расставлены не по алфавиту и не по дате — по какой-то системе, которую он пока не мог разгадать.</p>'
    WHEN 3 THEN '<p>— Вы же знаете, что после дождя улица Кленовая поворачивает не туда? — сказала она, как будто это было самым обычным делом.</p>'
    WHEN 4 THEN '<p>Записка в подвале была датирована следующим вторником. Почерк был его собственный.</p>'
  END,
  'ic',
  NOW() - ((25 - i) * INTERVAL '4 hours')
FROM generate_series(1, 25) AS i;

-- Both participants consent to publish
INSERT INTO game_publish_consent (game_id, participant_id, consented) VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'bb111111-1111-1111-1111-111111111111', true),
  ('aaaa1111-1111-1111-1111-111111111111', 'bb111111-2222-2222-2222-222222222222', true)
ON CONFLICT DO NOTHING;

-- Game 2: Luna + Ember — "Чернила на полях"
INSERT INTO games (id, request_id, ooc_enabled, status)
SELECT 'aaaa2222-2222-2222-2222-222222222222',
       r.id, false, 'active'
FROM requests r WHERE r.title = 'Чернила на полях'
ON CONFLICT DO NOTHING;

INSERT INTO game_participants (id, game_id, user_id, nickname, avatar_url) VALUES
  ('bb222222-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111', 'Маргарита', NULL),
  ('bb222222-2222-2222-2222-222222222222', 'aaaa2222-2222-2222-2222-222222222222',
   '33333333-3333-3333-3333-333333333333', 'Букинист', NULL)
ON CONFLICT DO NOTHING;

-- 22 IC messages alternating between participants
INSERT INTO messages (game_id, participant_id, content, type, created_at)
SELECT 'aaaa2222-2222-2222-2222-222222222222',
  CASE WHEN i % 2 = 1
    THEN 'bb222222-1111-1111-1111-111111111111'::uuid
    ELSE 'bb222222-2222-2222-2222-222222222222'::uuid
  END,
  CASE (i % 5)
    WHEN 0 THEN '<p>Книга лежала на прилавке, как будто ждала именно её. Без обложки, без названия — только пожелтевшие страницы и чьи-то заметки на полях.</p>'
    WHEN 1 THEN '<p>Он нашёл первую пометку на странице 42: «Если ты это читаешь — мы уже знакомы. Просто ты пока не знаешь об этом.»</p>'
    WHEN 2 THEN '<p>Она ответила на полях страницы 43, синими чернилами: «Кто вы? И почему ваш почерк похож на мой?»</p>'
    WHEN 3 THEN '<p>Лавка закрывалась в шесть, но книга оставалась на месте. Каждое утро — новая запись, которой вчера не было.</p>'
    WHEN 4 THEN '<p>«Мне кажется, эта книга пишет нас, а не мы её» — было написано карандашом, едва заметно, на самом последнем развороте.</p>'
  END,
  'ic',
  NOW() - ((22 - i) * INTERVAL '6 hours')
FROM generate_series(1, 22) AS i;

-- Both participants consent to publish
INSERT INTO game_publish_consent (game_id, participant_id, consented) VALUES
  ('aaaa2222-2222-2222-2222-222222222222', 'bb222222-1111-1111-1111-111111111111', true),
  ('aaaa2222-2222-2222-2222-222222222222', 'bb222222-2222-2222-2222-222222222222', true)
ON CONFLICT DO NOTHING;

-- Game 3: Luna + Starfall — "Станция «Предел»" (active, Starfall proposed to publish)
INSERT INTO games (id, request_id, ooc_enabled, status)
SELECT 'aaaa3333-3333-3333-3333-333333333333',
       r.id, true, 'active'
FROM requests r WHERE r.title = 'Станция «Предел» — 400 дней до связи'
ON CONFLICT DO NOTHING;

INSERT INTO game_participants (id, game_id, user_id, nickname, avatar_url) VALUES
  ('bb333333-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333',
   '11111111-1111-1111-1111-111111111111', 'Навигатор Рен', NULL),
  ('bb333333-2222-2222-2222-222222222222', 'aaaa3333-3333-3333-3333-333333333333',
   '44444444-4444-4444-4444-444444444444', 'Инженер Кай', NULL)
ON CONFLICT DO NOTHING;

-- 24 IC messages alternating between participants
INSERT INTO messages (game_id, participant_id, content, type, created_at)
SELECT 'aaaa3333-3333-3333-3333-333333333333',
  CASE WHEN i % 2 = 1
    THEN 'bb333333-1111-1111-1111-111111111111'::uuid
    ELSE 'bb333333-2222-2222-2222-222222222222'::uuid
  END,
  CASE (i % 6)
    WHEN 0 THEN '<p>Рен проснулся от тишины. Не от звука — именно от её отсутствия. Гул вентиляции, ставший частью сознания за 312 дней, смолк.</p>'
    WHEN 1 THEN '<p>Кай проверил панель: все системы в норме. Вентиляция работала. Но показания расходились с тем, что слышали уши.</p>'
    WHEN 2 THEN '<p>— Ты двигал мою кружку? — спросил Рен за завтраком. Кружка стояла на левом краю стола. Он всегда ставил на правый.</p>'
    WHEN 3 THEN '<p>— Не трогал. — Кай поднял глаза от планшета. — Но у меня тоже. Отвёртка лежала в ящике B, хотя я точно оставлял в C.</p>'
    WHEN 4 THEN '<p>Журнал показаний за последние сутки: температура отсека 3 дважды подскочила на 0.7 градуса. Без видимой причины. Рен записал и перечитал запись трижды.</p>'
    WHEN 5 THEN '<p>Кай нашёл царапину на переборке у шлюза. Свежую. Ни один из них не помнил, чтобы задевал стену чем-то острым.</p>'
  END,
  'ic',
  NOW() - ((24 - i) * INTERVAL '5 hours')
FROM generate_series(1, 24) AS i;

-- Starfall proposed to publish — Luna sees the banner
INSERT INTO game_publish_consent (game_id, participant_id, consented) VALUES
  ('aaaa3333-3333-3333-3333-333333333333', 'bb333333-2222-2222-2222-222222222222', true)
ON CONFLICT DO NOTHING;

-- Seed: luna = admin
UPDATE users SET role = 'admin' WHERE email = 'luna@apocryph.test';
