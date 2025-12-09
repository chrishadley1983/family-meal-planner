-- Add customSchedule field to meal_plans table for week-specific overrides
ALTER TABLE "meal_plans" ADD COLUMN "customSchedule" JSONB DEFAULT NULL;

-- Update existing family_profiles with default meal schedule (Breakfast, Lunch, Dinner for all days)
-- Only update profiles where mealAvailability is empty object
UPDATE "family_profiles"
SET "mealAvailability" = '{
  "monday": ["breakfast", "lunch", "dinner"],
  "tuesday": ["breakfast", "lunch", "dinner"],
  "wednesday": ["breakfast", "lunch", "dinner"],
  "thursday": ["breakfast", "lunch", "dinner"],
  "friday": ["breakfast", "lunch", "dinner"],
  "saturday": ["breakfast", "lunch", "dinner"],
  "sunday": ["breakfast", "lunch", "dinner"]
}'::jsonb
WHERE "mealAvailability"::text = '{}'::text OR "mealAvailability" IS NULL;

-- Comment: mealAvailability field is now used for storing meal schedules per profile
-- Format: { "monday": ["breakfast", "lunch", ...], "tuesday": [...], ... }
-- Valid meal types: breakfast, morning-snack, lunch, afternoon-snack, dinner, dessert, evening-snack
