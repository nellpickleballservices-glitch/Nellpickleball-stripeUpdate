-- Expeditions: adventure trip cards shown on the home page
-- Each row is a clickable card with a header image, date range, short description,
-- and rich detail content that is shown on the expedition's own page.

CREATE TABLE IF NOT EXISTS expeditions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title_es       text        NOT NULL,
  title_en       text        NOT NULL,
  description_es text,
  description_en text,
  details_es     text,           -- rich HTML from TipTap (Spanish)
  details_en     text,           -- rich HTML from TipTap (English)
  image_url      text        NOT NULL,
  start_date     date        NOT NULL,
  end_date       date        NOT NULL,
  is_published   boolean     NOT NULL DEFAULT false,
  sort_order     integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expeditions ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can read published expeditions
CREATE POLICY "expeditions_public_read"
  ON expeditions FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

-- Service role (used by supabaseAdmin) bypasses RLS — no extra policy needed
