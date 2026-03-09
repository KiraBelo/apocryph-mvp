-- ================================================================
-- Апокриф — seed-данные тегов (~300 тегов, 8 категорий)
-- Запуск: psql -U apocryph -d apocryph < scripts/seed-tags.sql
-- ================================================================

-- Хелпер: вставка тега + i18n (ru обязателен, en опционален)
-- Использование: SELECT insert_tag('slug', 'category', 'название_ru', 'name_en');
CREATE OR REPLACE FUNCTION insert_tag(
  p_slug TEXT, p_category TEXT, p_name_ru TEXT, p_name_en TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_id INTEGER;
BEGIN
  INSERT INTO tags (slug, category, approved, reviewed)
  VALUES (p_slug, p_category, true, true)
  ON CONFLICT (slug) DO UPDATE SET category = p_category
  RETURNING id INTO v_id;

  INSERT INTO tag_i18n (tag_id, lang, name) VALUES (v_id, 'ru', p_name_ru)
  ON CONFLICT (tag_id, lang) DO UPDATE SET name = p_name_ru;

  IF p_name_en IS NOT NULL THEN
    INSERT INTO tag_i18n (tag_id, lang, name) VALUES (v_id, 'en', p_name_en)
    ON CONFLICT (tag_id, lang) DO UPDATE SET name = p_name_en;
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════
-- FANDOM (~80 тегов)
-- ════════════════════════════════════════════════════════════════

SELECT insert_tag('гарри поттер', 'fandom', 'Гарри Поттер', 'Harry Potter', 'hp');
SELECT insert_tag('ведьмак', 'fandom', 'Ведьмак', 'The Witcher', 'witcher');
SELECT insert_tag('шерлок', 'fandom', 'Шерлок', 'Sherlock', 'sherlock');
SELECT insert_tag('властелин колец', 'fandom', 'Властелин Колец', 'Lord of the Rings');
SELECT insert_tag('star wars', 'fandom', 'Звёздные Войны', 'Star Wars');
SELECT insert_tag('marvel', 'fandom', 'Марвел', 'Marvel');
SELECT insert_tag('dc', 'fandom', 'DC', 'DC');
SELECT insert_tag('наруто', 'fandom', 'Наруто', 'Naruto');
SELECT insert_tag('блич', 'fandom', 'Блич', 'Bleach');
SELECT insert_tag('ван пис', 'fandom', 'Ван Пис', 'One Piece');
SELECT insert_tag('атака титанов', 'fandom', 'Атака Титанов', 'Attack on Titan');
SELECT insert_tag('клинок рассекающий демонов', 'fandom', 'Клинок, рассекающий демонов', 'Demon Slayer');
SELECT insert_tag('магическая битва', 'fandom', 'Магическая битва', 'Jujutsu Kaisen');
SELECT insert_tag('бродячие псы', 'fandom', 'Великий из бродячих псов', 'Bungou Stray Dogs');
SELECT insert_tag('haikyuu', 'fandom', 'Хайкью!!', 'Haikyuu!!');
SELECT insert_tag('genshin impact', 'fandom', 'Геншин Импакт', 'Genshin Impact');
SELECT insert_tag('honkai star rail', 'fandom', 'Хонкай: Star Rail', 'Honkai: Star Rail');
SELECT insert_tag('хеллсинг', 'fandom', 'Хеллсинг', 'Hellsing');
SELECT insert_tag('токийский гуль', 'fandom', 'Токийский гуль', 'Tokyo Ghoul');
SELECT insert_tag('тетрадь смерти', 'fandom', 'Тетрадь смерти', 'Death Note');
SELECT insert_tag('евангелион', 'fandom', 'Евангелион', 'Evangelion');
SELECT insert_tag('sailor moon', 'fandom', 'Сейлор Мун', 'Sailor Moon');
SELECT insert_tag('dragon age', 'fandom', 'Dragon Age', 'Dragon Age');
SELECT insert_tag('mass effect', 'fandom', 'Mass Effect', 'Mass Effect');
SELECT insert_tag('baldurs gate', 'fandom', 'Baldur''s Gate', 'Baldur''s Gate');
SELECT insert_tag('skyrim', 'fandom', 'Скайрим', 'Skyrim');
SELECT insert_tag('dark souls', 'fandom', 'Dark Souls', 'Dark Souls');
SELECT insert_tag('elden ring', 'fandom', 'Elden Ring', 'Elden Ring');
SELECT insert_tag('hollow knight', 'fandom', 'Hollow Knight', 'Hollow Knight');
SELECT insert_tag('undertale', 'fandom', 'Undertale', 'Undertale');
SELECT insert_tag('final fantasy', 'fandom', 'Final Fantasy', 'Final Fantasy');
SELECT insert_tag('persona', 'fandom', 'Persona', 'Persona');
SELECT insert_tag('resident evil', 'fandom', 'Resident Evil', 'Resident Evil');
SELECT insert_tag('silent hill', 'fandom', 'Silent Hill', 'Silent Hill');
SELECT insert_tag('the last of us', 'fandom', 'The Last of Us', 'The Last of Us');
SELECT insert_tag('cyberpunk 2077', 'fandom', 'Cyberpunk 2077', 'Cyberpunk 2077');
SELECT insert_tag('dota', 'fandom', 'Dota', 'Dota');
SELECT insert_tag('league of legends', 'fandom', 'League of Legends', 'League of Legends');
SELECT insert_tag('мастер и маргарита', 'fandom', 'Мастер и Маргарита', 'The Master and Margarita');
SELECT insert_tag('война и мир', 'fandom', 'Война и мир', 'War and Peace');
SELECT insert_tag('преступление и наказание', 'fandom', 'Преступление и наказание', 'Crime and Punishment');
SELECT insert_tag('дюна', 'fandom', 'Дюна', 'Dune');
SELECT insert_tag('игра престолов', 'fandom', 'Игра Престолов', 'Game of Thrones');
SELECT insert_tag('the mandalorian', 'fandom', 'Мандалорец', 'The Mandalorian');
SELECT insert_tag('supernatural', 'fandom', 'Сверхъестественное', 'Supernatural');
SELECT insert_tag('доктор кто', 'fandom', 'Доктор Кто', 'Doctor Who');
SELECT insert_tag('stranger things', 'fandom', 'Очень странные дела', 'Stranger Things');
SELECT insert_tag('the umbrella academy', 'fandom', 'Академия Амбрелла', 'The Umbrella Academy');
SELECT insert_tag('arcane', 'fandom', 'Аркейн', 'Arcane');
SELECT insert_tag('wednesday', 'fandom', 'Уэнсдей', 'Wednesday');
SELECT insert_tag('интерстеллар', 'fandom', 'Интерстеллар', 'Interstellar');
SELECT insert_tag('матрица', 'fandom', 'Матрица', 'The Matrix');
SELECT insert_tag('пираты карибского моря', 'fandom', 'Пираты Карибского моря', 'Pirates of the Caribbean');
SELECT insert_tag('вампирские хроники', 'fandom', 'Вампирские хроники', 'The Vampire Chronicles');
SELECT insert_tag('сумерки', 'fandom', 'Сумерки', 'Twilight');
SELECT insert_tag('голодные игры', 'fandom', 'Голодные игры', 'The Hunger Games');
SELECT insert_tag('percy jackson', 'fandom', 'Перси Джексон', 'Percy Jackson');
SELECT insert_tag('хроники нарнии', 'fandom', 'Хроники Нарнии', 'The Chronicles of Narnia');
SELECT insert_tag('fullmetal alchemist', 'fandom', 'Стальной алхимик', 'Fullmetal Alchemist');
SELECT insert_tag('hunter x hunter', 'fandom', 'Hunter x Hunter', 'Hunter x Hunter');
SELECT insert_tag('my hero academia', 'fandom', 'Моя геройская академия', 'My Hero Academia');
SELECT insert_tag('spy x family', 'fandom', 'Семья шпиона', 'Spy x Family');
SELECT insert_tag('chainsaw man', 'fandom', 'Человек-бензопила', 'Chainsaw Man');
SELECT insert_tag('mob psycho 100', 'fandom', 'Моб Психо 100', 'Mob Psycho 100');
SELECT insert_tag('one punch man', 'fandom', 'Ванпанчмен', 'One Punch Man');
SELECT insert_tag('made in abyss', 'fandom', 'Созданный в бездне', 'Made in Abyss');
SELECT insert_tag('danganronpa', 'fandom', 'Данганронпа', 'Danganronpa');
SELECT insert_tag('detroit become human', 'fandom', 'Detroit: Become Human', 'Detroit: Become Human');
SELECT insert_tag('dishonored', 'fandom', 'Dishonored', 'Dishonored');
SELECT insert_tag('bioshock', 'fandom', 'BioShock', 'BioShock');
SELECT insert_tag('overwatch', 'fandom', 'Overwatch', 'Overwatch');
SELECT insert_tag('valorant', 'fandom', 'Valorant', 'Valorant');
SELECT insert_tag('zelda', 'fandom', 'The Legend of Zelda', 'The Legend of Zelda');
SELECT insert_tag('fire emblem', 'fandom', 'Fire Emblem', 'Fire Emblem');
SELECT insert_tag('warhammer', 'fandom', 'Warhammer', 'Warhammer');
SELECT insert_tag('dnd', 'fandom', 'D&D', 'D&D');
SELECT insert_tag('world of darkness', 'fandom', 'Мир Тьмы', 'World of Darkness');
SELECT insert_tag('call of cthulhu', 'fandom', 'Зов Ктулху', 'Call of Cthulhu');
SELECT insert_tag('vampire the masquerade', 'fandom', 'Вампиры: Маскарад', 'Vampire: The Masquerade');
SELECT insert_tag('ориджинал', 'fandom', 'Ориджинал', 'Original');

-- ════════════════════════════════════════════════════════════════
-- GENRE (~40 тегов)
-- ════════════════════════════════════════════════════════════════

SELECT insert_tag('фэнтези', 'genre', 'Фэнтези', 'Fantasy');
SELECT insert_tag('дарк фэнтези', 'genre', 'Дарк фэнтези', 'Dark Fantasy');
SELECT insert_tag('городское фэнтези', 'genre', 'Городское фэнтези', 'Urban Fantasy');
SELECT insert_tag('высокое фэнтези', 'genre', 'Высокое фэнтези', 'High Fantasy');
SELECT insert_tag('научная фантастика', 'genre', 'Научная фантастика', 'Science Fiction');
SELECT insert_tag('космоопера', 'genre', 'Космоопера', 'Space Opera');
SELECT insert_tag('киберпанк', 'genre', 'Киберпанк', 'Cyberpunk');
SELECT insert_tag('стимпанк', 'genre', 'Стимпанк', 'Steampunk');
SELECT insert_tag('постапокалипсис', 'genre', 'Постапокалипсис', 'Post-Apocalypse');
SELECT insert_tag('хоррор', 'genre', 'Хоррор', 'Horror');
SELECT insert_tag('психологический хоррор', 'genre', 'Психологический хоррор', 'Psychological Horror');
SELECT insert_tag('детектив', 'genre', 'Детектив', 'Detective');
SELECT insert_tag('нуар', 'genre', 'Нуар', 'Noir');
SELECT insert_tag('триллер', 'genre', 'Триллер', 'Thriller');
SELECT insert_tag('романтика', 'genre', 'Романтика', 'Romance');
SELECT insert_tag('драма', 'genre', 'Драма', 'Drama');
SELECT insert_tag('комедия', 'genre', 'Комедия', 'Comedy');
SELECT insert_tag('трагедия', 'genre', 'Трагедия', 'Tragedy');
SELECT insert_tag('мистика', 'genre', 'Мистика', 'Mysticism');
SELECT insert_tag('боевик', 'genre', 'Боевик', 'Action');
SELECT insert_tag('приключения', 'genre', 'Приключения', 'Adventure');
SELECT insert_tag('исторический', 'genre', 'Исторический', 'Historical');
SELECT insert_tag('альтернативная история', 'genre', 'Альтернативная история', 'Alternative History');
SELECT insert_tag('повседневность', 'genre', 'Повседневность', 'Slice of Life');
SELECT insert_tag('сёнен', 'genre', 'Сёнен', 'cенен', 'Shounen');
SELECT insert_tag('сёдзё', 'genre', 'Сёдзё', 'сёдзё', 'Shoujo');
SELECT insert_tag('сёнен-ай', 'genre', 'Сёнен-ай', 'Shounen-ai');
SELECT insert_tag('сёдзё-ай', 'genre', 'Сёдзё-ай', 'Shoujo-ai');
SELECT insert_tag('яой', 'genre', 'Яой', 'Yaoi');
SELECT insert_tag('юри', 'genre', 'Юри', 'Yuri');
SELECT insert_tag('гарем', 'genre', 'Гарем', 'Harem');
SELECT insert_tag('исекай', 'genre', 'Исекай', 'Isekai');
SELECT insert_tag('литрпг', 'genre', 'ЛитРПГ', 'LitRPG');
SELECT insert_tag('вестерн', 'genre', 'Вестерн', 'Western');
SELECT insert_tag('готика', 'genre', 'Готика', 'Gothic');
SELECT insert_tag('мифология', 'genre', 'Мифология', 'Mythology');
SELECT insert_tag('сказка', 'genre', 'Сказка', 'Fairy Tale');
SELECT insert_tag('антиутопия', 'genre', 'Антиутопия', 'Dystopia');
SELECT insert_tag('утопия', 'genre', 'Утопия', 'Utopia');
SELECT insert_tag('абсурд', 'genre', 'Абсурд', 'Absurdism');

-- ════════════════════════════════════════════════════════════════
-- TROPE (~60 тегов)
-- ════════════════════════════════════════════════════════════════

SELECT insert_tag('enemies to lovers', 'trope', 'Из врагов в любовники', 'Enemies to Lovers');
SELECT insert_tag('friends to lovers', 'trope', 'Из друзей в любовники', 'Friends to Lovers');
SELECT insert_tag('slow burn', 'trope', 'слоубёрн', 'слоуберн', 'Slow Burn');
SELECT insert_tag('fake dating', 'trope', 'Фиктивные отношения', 'Fake Dating');
SELECT insert_tag('found family', 'trope', 'Обретённая семья', 'Found Family');
SELECT insert_tag('amnesia', 'trope', 'Амнезия', 'Amnesia');
SELECT insert_tag('forced proximity', 'trope', 'Вынужденная близость', 'Forced Proximity');
SELECT insert_tag('hurt comfort', 'trope', 'Hurt/Comfort', 'Hurt/Comfort');
SELECT insert_tag('betrayal', 'trope', 'Предательство', 'Betrayal');
SELECT insert_tag('redemption arc', 'trope', 'Искупление', 'Redemption Arc');
SELECT insert_tag('unreliable narrator', 'trope', 'Ненадёжный рассказчик', 'Unreliable Narrator');
SELECT insert_tag('time loop', 'trope', 'Петля времени', 'Time Loop');
SELECT insert_tag('time travel', 'trope', 'Путешествие во времени', 'Time Travel');
SELECT insert_tag('au', 'trope', 'AU (альтернативная вселенная)', 'AU (Alternate Universe)');
SELECT insert_tag('fix-it', 'trope', 'Фикс-ит', 'Fix-It');
SELECT insert_tag('angst', 'trope', 'Ангст', 'Angst');
SELECT insert_tag('fluff', 'trope', 'Флафф', 'Fluff');
SELECT insert_tag('whump', 'trope', 'Вамп', 'Whump');
SELECT insert_tag('soulmates', 'trope', 'Соулмейты', 'Soulmates');
SELECT insert_tag('hanahaki', 'trope', 'Ханахаки', 'Hanahaki');
SELECT insert_tag('rivals', 'trope', 'Соперники', 'Rivals');
SELECT insert_tag('forbidden love', 'trope', 'Запретная любовь', 'Forbidden Love');
SELECT insert_tag('age gap', 'trope', 'Разница в возрасте', 'Age Gap');
SELECT insert_tag('power imbalance', 'trope', 'Дисбаланс сил', 'Power Imbalance');
SELECT insert_tag('secret identity', 'trope', 'Тайная личность', 'Secret Identity');
SELECT insert_tag('masquerade', 'trope', 'Маскарад', 'Masquerade');
SELECT insert_tag('chosen one', 'trope', 'Избранный', 'The Chosen One');
SELECT insert_tag('mentor student', 'trope', 'Учитель и ученик', 'Mentor & Student');
SELECT insert_tag('royalty', 'trope', 'Роялти', 'Royalty');
SELECT insert_tag('arranged marriage', 'trope', 'Договорной брак', 'Arranged Marriage');
SELECT insert_tag('love triangle', 'trope', 'Любовный треугольник', 'Love Triangle');
SELECT insert_tag('mutual pining', 'trope', 'Взаимная тоска', 'Mutual Pining');
SELECT insert_tag('one bed', 'trope', 'Одна кровать на двоих', 'There Was Only One Bed');
SELECT insert_tag('coffee shop au', 'trope', 'Кофешоп AU', 'Coffee Shop AU');
SELECT insert_tag('college au', 'trope', 'Колледж AU', 'College AU');
SELECT insert_tag('modern au', 'trope', 'Модерн AU', 'Modern AU');
SELECT insert_tag('mafia au', 'trope', 'Мафия AU', 'Mafia AU');
SELECT insert_tag('vampire au', 'trope', 'Вампир AU', 'Vampire AU');
SELECT insert_tag('zombie apocalypse', 'trope', 'Зомби-апокалипсис', 'Zombie Apocalypse');
SELECT insert_tag('survival', 'trope', 'Выживание', 'Survival');
SELECT insert_tag('mystery', 'trope', 'Расследование', 'Mystery');
SELECT insert_tag('political intrigue', 'trope', 'Политические интриги', 'Political Intrigue');
SELECT insert_tag('heist', 'trope', 'Ограбление', 'Heist');
SELECT insert_tag('tournament arc', 'trope', 'Турнирная арка', 'Tournament Arc');
SELECT insert_tag('training arc', 'trope', 'Арка тренировок', 'Training Arc');
SELECT insert_tag('dark secret', 'trope', 'Тёмная тайна', 'Dark Secret');
SELECT insert_tag('corruption arc', 'trope', 'Арка падения', 'Corruption Arc');
SELECT insert_tag('resurrection', 'trope', 'Воскрешение', 'Resurrection');
SELECT insert_tag('reincarnation', 'trope', 'Реинкарнация', 'Reincarnation');
SELECT insert_tag('body swap', 'trope', 'Обмен телами', 'Body Swap');
SELECT insert_tag('mind control', 'trope', 'Контроль разума', 'Mind Control');
SELECT insert_tag('curse', 'trope', 'Проклятие', 'Curse');
SELECT insert_tag('prophecy', 'trope', 'Пророчество', 'Prophecy');
SELECT insert_tag('quest', 'trope', 'Квест', 'Quest');
SELECT insert_tag('dungeon crawl', 'trope', 'Подземелье', 'Dungeon Crawl');
SELECT insert_tag('war', 'trope', 'Война', 'War');
SELECT insert_tag('rebellion', 'trope', 'Восстание', 'Rebellion');
SELECT insert_tag('slice of life', 'trope', 'Повседневность', 'Slice of Life');
SELECT insert_tag('road trip', 'trope', 'Дорожное приключение', 'Road Trip');
SELECT insert_tag('de-aging', 'trope', 'Омоложение', 'De-aging');

-- ════════════════════════════════════════════════════════════════
-- SETTING (~40 тегов)
-- ════════════════════════════════════════════════════════════════

SELECT insert_tag('современность', 'setting', 'Современность', 'Modern Day');
SELECT insert_tag('средневековье', 'setting', 'Средневековье', 'Medieval');
SELECT insert_tag('викторианская эпоха', 'setting', 'Викторианская эпоха', 'Victorian Era');
SELECT insert_tag('античность', 'setting', 'Античность', 'Antiquity');
SELECT insert_tag('эпоха возрождения', 'setting', 'Эпоха Возрождения', 'Renaissance');
SELECT insert_tag('1920-е', 'setting', '1920-е', '1920s');
SELECT insert_tag('1980-е', 'setting', '1980-е', '1980s');
SELECT insert_tag('ближайшее будущее', 'setting', 'Ближайшее будущее', 'Near Future');
SELECT insert_tag('далёкое будущее', 'setting', 'Далёкое будущее', 'Far Future');
SELECT insert_tag('космос', 'setting', 'Космос', 'Space');
SELECT insert_tag('космическая станция', 'setting', 'Космическая станция', 'Space Station');
SELECT insert_tag('академия', 'setting', 'Академия', 'Academy');
SELECT insert_tag('школа магии', 'setting', 'Школа магии', 'Magic School');
SELECT insert_tag('университет', 'setting', 'Университет', 'University');
SELECT insert_tag('город', 'setting', 'Город', 'City');
SELECT insert_tag('мегаполис', 'setting', 'Мегаполис', 'Megacity');
SELECT insert_tag('деревня', 'setting', 'Деревня', 'Village');
SELECT insert_tag('лес', 'setting', 'Лес', 'Forest');
SELECT insert_tag('горы', 'setting', 'Горы', 'Mountains');
SELECT insert_tag('океан', 'setting', 'Океан', 'Ocean');
SELECT insert_tag('остров', 'setting', 'Остров', 'Island');
SELECT insert_tag('подземелье', 'setting', 'Подземелье', 'Dungeon');
SELECT insert_tag('замок', 'setting', 'Замок', 'Castle');
SELECT insert_tag('таверна', 'setting', 'Таверна', 'Tavern');
SELECT insert_tag('тюрьма', 'setting', 'Тюрьма', 'Prison');
SELECT insert_tag('больница', 'setting', 'Больница', 'Hospital');
SELECT insert_tag('корабль', 'setting', 'Корабль', 'Ship');
SELECT insert_tag('поезд', 'setting', 'Поезд', 'Train');
SELECT insert_tag('пустошь', 'setting', 'Пустошь', 'Wasteland');
SELECT insert_tag('подводный город', 'setting', 'Подводный город', 'Underwater City');
SELECT insert_tag('параллельный мир', 'setting', 'Параллельный мир', 'Parallel World');
SELECT insert_tag('сновидение', 'setting', 'Сновидение', 'Dreamscape');
SELECT insert_tag('загробный мир', 'setting', 'Загробный мир', 'Afterlife');
SELECT insert_tag('ад', 'setting', 'Ад', 'Hell');
SELECT insert_tag('рай', 'setting', 'Рай', 'Heaven');
SELECT insert_tag('япония', 'setting', 'Япония', 'Japan');
SELECT insert_tag('россия', 'setting', 'Россия', 'Russia');
SELECT insert_tag('европа', 'setting', 'Европа', 'Europe');
SELECT insert_tag('сша', 'setting', 'США', 'USA');
SELECT insert_tag('вымышленный мир', 'setting', 'Вымышленный мир', 'Fictional World');

-- ════════════════════════════════════════════════════════════════
-- CHARACTER_TYPE (~30 тегов)
-- ════════════════════════════════════════════════════════════════

SELECT insert_tag('oc', 'character_type', 'OC (свой персонаж)', 'OC (Original Character)');
SELECT insert_tag('канон', 'character_type', 'Канонный персонаж', 'Canon Character');
SELECT insert_tag('антигерой', 'character_type', 'Антигерой', 'Antihero');
SELECT insert_tag('злодей', 'character_type', 'Злодей', 'Villain');
SELECT insert_tag('наёмник', 'character_type', 'Наёмник', 'Mercenary');
SELECT insert_tag('маг', 'character_type', 'Маг', 'Mage');
SELECT insert_tag('целитель', 'character_type', 'Целитель', 'Healer');
SELECT insert_tag('рыцарь', 'character_type', 'Рыцарь', 'Knight');
SELECT insert_tag('ассасин', 'character_type', 'Ассасин', 'Assassin');
SELECT insert_tag('учёный', 'character_type', 'Учёный', 'Scientist');
SELECT insert_tag('пират', 'character_type', 'Пират', 'Pirate');
SELECT insert_tag('вампир', 'character_type', 'Вампир', 'Vampire');
SELECT insert_tag('оборотень', 'character_type', 'Оборотень', 'Werewolf');
SELECT insert_tag('демон', 'character_type', 'Демон', 'Demon');
SELECT insert_tag('ангел', 'character_type', 'Ангел', 'Angel');
SELECT insert_tag('дракон', 'character_type', 'Дракон', 'Dragon');
SELECT insert_tag('эльф', 'character_type', 'Эльф', 'Elf');
SELECT insert_tag('гном', 'character_type', 'Гном', 'Dwarf');
SELECT insert_tag('орк', 'character_type', 'Орк', 'Orc');
SELECT insert_tag('робот', 'character_type', 'Робот', 'Robot');
SELECT insert_tag('андроид', 'character_type', 'Андроид', 'Android');
SELECT insert_tag('призрак', 'character_type', 'Призрак', 'Ghost');
SELECT insert_tag('божество', 'character_type', 'Божество', 'Deity');
SELECT insert_tag('некромант', 'character_type', 'Некромант', 'Necromancer');
SELECT insert_tag('алхимик', 'character_type', 'Алхимик', 'Alchemist');
SELECT insert_tag('бард', 'character_type', 'Бард', 'Bard');
SELECT insert_tag('шпион', 'character_type', 'Шпион', 'Spy');
SELECT insert_tag('монстр', 'character_type', 'Монстр', 'Monster');
SELECT insert_tag('нежить', 'character_type', 'Нежить', 'Undead');
SELECT insert_tag('фейри', 'character_type', 'Фейри', 'Fae');

-- ════════════════════════════════════════════════════════════════
-- MOOD (~25 тегов)
-- ════════════════════════════════════════════════════════════════

SELECT insert_tag('дарк', 'mood', 'Дарк', 'Dark');
SELECT insert_tag('лёгкая', 'mood', 'Лёгкая', 'Lighthearted');
SELECT insert_tag('психология', 'mood', 'Психология', 'Psychological');
SELECT insert_tag('интрига', 'mood', 'Интрига', 'Intrigue');
SELECT insert_tag('напряжение', 'mood', 'Напряжение', 'Tension');
SELECT insert_tag('юмор', 'mood', 'Юмор', 'Humor');
SELECT insert_tag('меланхолия', 'mood', 'Меланхолия', 'Melancholy');
SELECT insert_tag('надежда', 'mood', 'Надежда', 'Hope');
SELECT insert_tag('ностальгия', 'mood', 'Ностальгия', 'Nostalgia');
SELECT insert_tag('экзистенциальный', 'mood', 'Экзистенциальный', 'Existential');
SELECT insert_tag('романтичное', 'mood', 'Романтичное', 'Romantic');
SELECT insert_tag('мрачное', 'mood', 'Мрачное', 'Grim');
SELECT insert_tag('уютное', 'mood', 'Уютное', 'Cozy');
SELECT insert_tag('эпичное', 'mood', 'Эпичное', 'Epic');
SELECT insert_tag('камерное', 'mood', 'Камерное', 'Intimate');
SELECT insert_tag('тревожное', 'mood', 'Тревожное', 'Anxious');
SELECT insert_tag('созерцательное', 'mood', 'Созерцательное', 'Contemplative');
SELECT insert_tag('безумное', 'mood', 'Безумное', 'Madness');
SELECT insert_tag('горько-сладкое', 'mood', 'Горько-сладкое', 'Bittersweet');
SELECT insert_tag('атмосферное', 'mood', 'Атмосферное', 'Atmospheric');
SELECT insert_tag('жуткое', 'mood', 'Жуткое', 'Eerie');
SELECT insert_tag('трагичное', 'mood', 'Трагичное', 'Tragic');
SELECT insert_tag('героическое', 'mood', 'Героическое', 'Heroic');
SELECT insert_tag('сатирическое', 'mood', 'Сатирическое', 'Satirical');
SELECT insert_tag('абсурдное', 'mood', 'Абсурдное', 'Absurd');

-- ════════════════════════════════════════════════════════════════
-- FORMAT (~20 тегов)
-- ════════════════════════════════════════════════════════════════

SELECT insert_tag('литературные посты', 'format', 'Литературные посты', 'Literary Posts');
SELECT insert_tag('смс', 'format', 'СМС', 'SMS');
SELECT insert_tag('смс и посты', 'format', 'СМС + посты', 'SMS + Posts');
SELECT insert_tag('быстрая игра', 'format', 'Быстрая игра', 'Quick Game');
SELECT insert_tag('pbp', 'format', 'PBP (play-by-post)', 'PBP (Play-by-Post)');
SELECT insert_tag('one-shot', 'format', 'Ваншот', 'One-Shot');
SELECT insert_tag('long-form', 'format', 'Длинная форма', 'Long-Form');
SELECT insert_tag('эпизодическая', 'format', 'Эпизодическая', 'Episodic');
SELECT insert_tag('sandbox', 'format', 'Песочница', 'Sandbox');
SELECT insert_tag('новеллизация', 'format', 'Новеллизация', 'Novelization');
SELECT insert_tag('дневниковый формат', 'format', 'Дневниковый формат', 'Diary Format');
SELECT insert_tag('переписка', 'format', 'Переписка', 'Correspondence');
SELECT insert_tag('чат-формат', 'format', 'Чат-формат', 'Chat Format');
SELECT insert_tag('пошаговая', 'format', 'Пошаговая', 'Turn-Based');
SELECT insert_tag('импровизация', 'format', 'Импровизация', 'Improv');
SELECT insert_tag('совместное письмо', 'format', 'Совместное письмо', 'Collaborative Writing');
SELECT insert_tag('мини-посты', 'format', 'Мини-посты', 'Mini Posts');
SELECT insert_tag('большие посты', 'format', 'Большие посты', 'Long Posts');
SELECT insert_tag('смешанный формат', 'format', 'Смешанный формат', 'Mixed Format');

-- ════════════════════════════════════════════════════════════════
-- OTHER (~15 тегов)
-- ════════════════════════════════════════════════════════════════

SELECT insert_tag('18+', 'other', '18+', '18+');
SELECT insert_tag('новичок', 'other', 'Новичок', 'Beginner');
SELECT insert_tag('опытный', 'other', 'Опытный', 'Experienced');
SELECT insert_tag('ищу соигрока', 'other', 'Ищу соигрока', 'Looking for Partner');
SELECT insert_tag('эксперимент', 'other', 'Эксперимент', 'Experiment');
SELECT insert_tag('кроссовер', 'other', 'Кроссовер', 'Crossover');
SELECT insert_tag('oc x oc', 'other', 'OC x OC', 'OC x OC');
SELECT insert_tag('oc x канон', 'other', 'OC x Канон', 'OC x Canon');
SELECT insert_tag('канон x канон', 'other', 'Канон x Канон', 'Canon x Canon');
SELECT insert_tag('мультифандом', 'other', 'Мультифандом', 'Multifandom');
SELECT insert_tag('без пейринга', 'other', 'Без пейринга', 'Gen (No Pairing)');
SELECT insert_tag('дружба', 'other', 'Дружба', 'Friendship');
SELECT insert_tag('семейная драма', 'other', 'Семейная драма', 'Family Drama');
SELECT insert_tag('экшен-ориентированная', 'other', 'Экшен-ориентированная', 'Action-Oriented');
SELECT insert_tag('сюжет важнее', 'other', 'Сюжет важнее', 'Plot-Driven');

-- ════════════════════════════════════════════════════════════════
-- АЛИАСЫ / СИНОНИМЫ
-- ════════════════════════════════════════════════════════════════

-- Фандомы
INSERT INTO tag_aliases (tag_id, alias) VALUES
  ((SELECT id FROM tags WHERE slug = 'гарри поттер'), 'hp'),
  ((SELECT id FROM tags WHERE slug = 'гарри поттер'), 'хогвартс'),
  ((SELECT id FROM tags WHERE slug = 'атака титанов'), 'snk'),
  ((SELECT id FROM tags WHERE slug = 'атака титанов'), 'shingeki no kyojin'),
  ((SELECT id FROM tags WHERE slug = 'клинок рассекающий демонов'), 'kimetsu no yaiba'),
  ((SELECT id FROM tags WHERE slug = 'клинок рассекающий демонов'), 'кня'),
  ((SELECT id FROM tags WHERE slug = 'магическая битва'), 'jjk'),
  ((SELECT id FROM tags WHERE slug = 'бродячие псы'), 'bsd'),
  ((SELECT id FROM tags WHERE slug = 'бродячие псы'), 'бсд'),
  ((SELECT id FROM tags WHERE slug = 'genshin impact'), 'геншин'),
  ((SELECT id FROM tags WHERE slug = 'genshin impact'), 'gi'),
  ((SELECT id FROM tags WHERE slug = 'honkai star rail'), 'хонкай'),
  ((SELECT id FROM tags WHERE slug = 'honkai star rail'), 'hsr'),
  ((SELECT id FROM tags WHERE slug = 'my hero academia'), 'bnha'),
  ((SELECT id FROM tags WHERE slug = 'my hero academia'), 'мга'),
  ((SELECT id FROM tags WHERE slug = 'my hero academia'), 'boku no hero academia'),
  ((SELECT id FROM tags WHERE slug = 'fullmetal alchemist'), 'fma'),
  ((SELECT id FROM tags WHERE slug = 'fullmetal alchemist'), 'стальной алхимик'),
  ((SELECT id FROM tags WHERE slug = 'hunter x hunter'), 'hxh'),
  ((SELECT id FROM tags WHERE slug = 'chainsaw man'), 'чензомен'),
  ((SELECT id FROM tags WHERE slug = 'chainsaw man'), 'csm'),
  ((SELECT id FROM tags WHERE slug = 'spy x family'), 'sxf'),
  ((SELECT id FROM tags WHERE slug = 'one punch man'), 'opm'),
  ((SELECT id FROM tags WHERE slug = 'наруто'), 'naruto'),
  ((SELECT id FROM tags WHERE slug = 'блич'), 'bleach'),
  ((SELECT id FROM tags WHERE slug = 'ван пис'), 'one piece'),
  ((SELECT id FROM tags WHERE slug = 'ван пис'), 'op'),
  ((SELECT id FROM tags WHERE slug = 'токийский гуль'), 'tokyo ghoul'),
  ((SELECT id FROM tags WHERE slug = 'тетрадь смерти'), 'death note'),
  ((SELECT id FROM tags WHERE slug = 'тетрадь смерти'), 'dn'),
  ((SELECT id FROM tags WHERE slug = 'шерлок'), 'sherlock'),
  ((SELECT id FROM tags WHERE slug = 'ведьмак'), 'witcher'),
  ((SELECT id FROM tags WHERE slug = 'властелин колец'), 'lotr'),
  ((SELECT id FROM tags WHERE slug = 'властелин колец'), 'толкин'),
  ((SELECT id FROM tags WHERE slug = 'властелин колец'), 'tolkien'),
  ((SELECT id FROM tags WHERE slug = 'игра престолов'), 'got'),
  ((SELECT id FROM tags WHERE slug = 'игра престолов'), 'песнь льда и огня'),
  ((SELECT id FROM tags WHERE slug = 'игра престолов'), 'asoiaf'),
  ((SELECT id FROM tags WHERE slug = 'baldurs gate'), 'bg3'),
  ((SELECT id FROM tags WHERE slug = 'dnd'), 'dungeons and dragons'),
  ((SELECT id FROM tags WHERE slug = 'dnd'), 'дндэ'),
  ((SELECT id FROM tags WHERE slug = 'dnd'), 'днд'),
  ((SELECT id FROM tags WHERE slug = 'danganronpa'), 'дангана'),
  ((SELECT id FROM tags WHERE slug = 'danganronpa'), 'dr'),
  ((SELECT id FROM tags WHERE slug = 'detroit become human'), 'dbh'),
  ((SELECT id FROM tags WHERE slug = 'star wars'), 'звёздные войны'),
  ((SELECT id FROM tags WHERE slug = 'star wars'), 'sw'),
  ((SELECT id FROM tags WHERE slug = 'marvel'), 'марвел'),
  ((SELECT id FROM tags WHERE slug = 'marvel'), 'mcu'),
  ((SELECT id FROM tags WHERE slug = 'supernatural'), 'спн'),
  ((SELECT id FROM tags WHERE slug = 'stranger things'), 'ост'),
  ((SELECT id FROM tags WHERE slug = 'wednesday'), 'уэнздей'),
  ((SELECT id FROM tags WHERE slug = 'percy jackson'), 'pjo'),
  ((SELECT id FROM tags WHERE slug = 'percy jackson'), 'перси джексон'),
  ((SELECT id FROM tags WHERE slug = 'vampire the masquerade'), 'vtm'),
  ((SELECT id FROM tags WHERE slug = 'warhammer'), 'вархаммер'),
  ((SELECT id FROM tags WHERE slug = 'warhammer'), 'wh40k'),
  ((SELECT id FROM tags WHERE slug = 'world of darkness'), 'wod')
ON CONFLICT (alias) DO NOTHING;

-- Жанры
INSERT INTO tag_aliases (tag_id, alias) VALUES
  ((SELECT id FROM tags WHERE slug = 'научная фантастика'), 'sci-fi'),
  ((SELECT id FROM tags WHERE slug = 'научная фантастика'), 'нф'),
  ((SELECT id FROM tags WHERE slug = 'фэнтези'), 'fantasy'),
  ((SELECT id FROM tags WHERE slug = 'хоррор'), 'horror'),
  ((SELECT id FROM tags WHERE slug = 'детектив'), 'detective'),
  ((SELECT id FROM tags WHERE slug = 'романтика'), 'romance'),
  ((SELECT id FROM tags WHERE slug = 'драма'), 'drama'),
  ((SELECT id FROM tags WHERE slug = 'комедия'), 'comedy'),
  ((SELECT id FROM tags WHERE slug = 'постапокалипсис'), 'postapoc'),
  ((SELECT id FROM tags WHERE slug = 'постапокалипсис'), 'пост-апок'),
  ((SELECT id FROM tags WHERE slug = 'киберпанк'), 'cyberpunk'),
  ((SELECT id FROM tags WHERE slug = 'стимпанк'), 'steampunk'),
  ((SELECT id FROM tags WHERE slug = 'исекай'), 'isekai'),
  ((SELECT id FROM tags WHERE slug = 'литрпг'), 'litrpg')
ON CONFLICT (alias) DO NOTHING;

-- Тропы
INSERT INTO tag_aliases (tag_id, alias) VALUES
  ((SELECT id FROM tags WHERE slug = 'enemies to lovers'), 'etl'),
  ((SELECT id FROM tags WHERE slug = 'enemies to lovers'), 'из врагов в любовники'),
  ((SELECT id FROM tags WHERE slug = 'friends to lovers'), 'ftl'),
  ((SELECT id FROM tags WHERE slug = 'slow burn'), 'слоуберн'),
  ((SELECT id FROM tags WHERE slug = 'slow burn'), 'медленный бёрн'),
  ((SELECT id FROM tags WHERE slug = 'hurt comfort'), 'h/c'),
  ((SELECT id FROM tags WHERE slug = 'hurt comfort'), 'хк'),
  ((SELECT id FROM tags WHERE slug = 'found family'), 'обретённая семья'),
  ((SELECT id FROM tags WHERE slug = 'fake dating'), 'фейк дейтинг'),
  ((SELECT id FROM tags WHERE slug = 'au'), 'альтернативная вселенная'),
  ((SELECT id FROM tags WHERE slug = 'angst'), 'ангст'),
  ((SELECT id FROM tags WHERE slug = 'fluff'), 'флафф'),
  ((SELECT id FROM tags WHERE slug = 'whump'), 'вамп')
ON CONFLICT (alias) DO NOTHING;

-- Форматы
INSERT INTO tag_aliases (tag_id, alias) VALUES
  ((SELECT id FROM tags WHERE slug = 'смс'), 'sms'),
  ((SELECT id FROM tags WHERE slug = 'смс'), 'сообщения'),
  ((SELECT id FROM tags WHERE slug = 'pbp'), 'play by post'),
  ((SELECT id FROM tags WHERE slug = 'one-shot'), 'ваншот'),
  ((SELECT id FROM tags WHERE slug = 'one-shot'), 'oneshot'),
  ((SELECT id FROM tags WHERE slug = 'быстрая игра'), 'быстрая'),
  ((SELECT id FROM tags WHERE slug = 'быстрая игра'), 'квик'),
  ((SELECT id FROM tags WHERE slug = 'литературные посты'), 'литпосты'),
  ((SELECT id FROM tags WHERE slug = 'литературные посты'), 'литературная')
ON CONFLICT (alias) DO NOTHING;

-- Прочее
INSERT INTO tag_aliases (tag_id, alias) VALUES
  ((SELECT id FROM tags WHERE slug = 'oc'), 'ос'),
  ((SELECT id FROM tags WHERE slug = 'oc'), 'оригинальный персонаж'),
  ((SELECT id FROM tags WHERE slug = 'канон'), 'canon'),
  ((SELECT id FROM tags WHERE slug = 'кроссовер'), 'crossover'),
  ((SELECT id FROM tags WHERE slug = 'новичок'), 'beginner'),
  ((SELECT id FROM tags WHERE slug = 'новичок'), 'нуб'),
  ((SELECT id FROM tags WHERE slug = 'ориджинал'), 'original'),
  ((SELECT id FROM tags WHERE slug = 'ориджинал'), 'ориг')
ON CONFLICT (alias) DO NOTHING;

-- Удалить хелпер-функцию после использования
DROP FUNCTION IF EXISTS insert_tag(TEXT, TEXT, TEXT, TEXT);

-- Вывести итого
SELECT
  category,
  COUNT(*) as count
FROM tags
GROUP BY category
ORDER BY count DESC;
