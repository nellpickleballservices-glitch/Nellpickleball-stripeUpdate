-- Expedition expiration date: a separate cutoff (e.g. signup deadline) that can
-- fall before the trip's start_date. When in the past, the public-facing UI
-- shows a "Registration closed" badge but still keeps the card visible.

ALTER TABLE expeditions
  ADD COLUMN IF NOT EXISTS expires_at date;
