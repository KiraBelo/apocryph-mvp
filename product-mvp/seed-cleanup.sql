-- Cleanup: remove all Luna's games except the 5 new ones,
-- add titles to the 5 new games

-- 1. Delete all Luna's other games (cascade deletes messages, participants, consents)
DELETE FROM games
WHERE id IN (
  SELECT gp.game_id FROM game_participants gp
  WHERE gp.user_id = '11111111-1111-1111-1111-111111111111'
)
AND id NOT IN (
  'ee000001-0000-0000-0000-000000000001',
  'ee000001-0000-0000-0000-000000000002',
  'ee000001-0000-0000-0000-000000000003',
  'ee000001-0000-0000-0000-000000000004',
  'ee000001-0000-0000-0000-000000000005'
);

-- 2. Create stub requests with titles for the 5 new games
INSERT INTO requests (id, author_id, title, body, type, content_level, fandom_type, pairing, tags, is_public, status) VALUES
  ('ef000001-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'Zerkalo i ten',
   '<p>.</p>', 'duo', 'rare', 'original', 'any', ARRAY[]::text[], false, 'inactive'),
  ('ef000001-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111111',
   'Tridtsat shagov do rassveta',
   '<p>.</p>', 'duo', 'rare', 'original', 'any', ARRAY[]::text[], false, 'inactive'),
  ('ef000001-0000-0000-0000-000000000003',
   '11111111-1111-1111-1111-111111111111',
   'Posledniy eksponat',
   '<p>.</p>', 'duo', 'none', 'original', 'any', ARRAY[]::text[], false, 'inactive'),
  ('ef000001-0000-0000-0000-000000000004',
   '11111111-1111-1111-1111-111111111111',
   'Sol i poroh',
   '<p>.</p>', 'duo', 'rare', 'original', 'any', ARRAY[]::text[], false, 'inactive'),
  ('ef000001-0000-0000-0000-000000000005',
   '11111111-1111-1111-1111-111111111111',
   'Dva golosa odna pesnya',
   '<p>.</p>', 'duo', 'none', 'original', 'any', ARRAY[]::text[], false, 'inactive')
ON CONFLICT DO NOTHING;

-- 3. Link requests to games
UPDATE games SET request_id = 'ef000001-0000-0000-0000-000000000001'
  WHERE id = 'ee000001-0000-0000-0000-000000000001';
UPDATE games SET request_id = 'ef000001-0000-0000-0000-000000000002'
  WHERE id = 'ee000001-0000-0000-0000-000000000002';
UPDATE games SET request_id = 'ef000001-0000-0000-0000-000000000003'
  WHERE id = 'ee000001-0000-0000-0000-000000000003';
UPDATE games SET request_id = 'ef000001-0000-0000-0000-000000000004'
  WHERE id = 'ee000001-0000-0000-0000-000000000004';
UPDATE games SET request_id = 'ef000001-0000-0000-0000-000000000005'
  WHERE id = 'ee000001-0000-0000-0000-000000000005';
