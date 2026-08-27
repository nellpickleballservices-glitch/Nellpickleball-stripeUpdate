-- Expeditions: support multiple images per card so the header can be a carousel.
-- image_url stays as the "cover" (first slide, used for OpenGraph); image_urls holds
-- the full ordered list of images shown in the carousel on the card and detail page.

ALTER TABLE expeditions
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

-- Backfill existing rows so they have at least their current cover image in the list.
UPDATE expeditions
  SET image_urls = ARRAY[image_url]
  WHERE COALESCE(array_length(image_urls, 1), 0) = 0
    AND image_url IS NOT NULL;
