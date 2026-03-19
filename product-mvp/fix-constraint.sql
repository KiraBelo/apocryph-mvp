ALTER TABLE games ADD CONSTRAINT games_status_check
  CHECK (status IN ('active', 'preparing', 'moderation', 'published'));
