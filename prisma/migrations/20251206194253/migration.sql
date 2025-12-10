-- This migration was a duplicate of 20251206170000_add_is_favorite_field
-- It has been converted to a no-op to maintain migration history consistency
-- Original: ALTER TABLE "recipes" ADD COLUMN "isFavorite" BOOLEAN NOT NULL DEFAULT false;
SELECT 1;
