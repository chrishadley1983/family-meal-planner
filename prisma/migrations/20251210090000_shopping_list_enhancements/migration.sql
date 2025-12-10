-- Shopping List Enhancements Migration
-- Adds support for named shopping lists, notes, multiple meal plan associations,
-- user-customizable categories, and improved item management

-- ============================================
-- 1. Modify shopping_lists table
-- ============================================

-- Add new columns to shopping_lists
ALTER TABLE "shopping_lists" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT 'Shopping List';
ALTER TABLE "shopping_lists" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "shopping_lists" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "shopping_lists" ADD COLUMN IF NOT EXISTS "finalized_at" TIMESTAMP(3);
ALTER TABLE "shopping_lists" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);

-- Rename generated_at to created_at for consistency (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_lists' AND column_name = 'generated_at') THEN
        ALTER TABLE "shopping_lists" RENAME COLUMN "generated_at" TO "created_at";
    END IF;
END $$;

-- Drop the old completed_at column (replaced by status + archivedAt)
ALTER TABLE "shopping_lists" DROP COLUMN IF EXISTS "completed_at";

-- Update status default from 'Generated' to 'Draft'
ALTER TABLE "shopping_lists" ALTER COLUMN "status" SET DEFAULT 'Draft';

-- Make weekStartDate optional (nullable)
ALTER TABLE "shopping_lists" ALTER COLUMN "week_start_date" DROP NOT NULL;

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS "shopping_lists_status_idx" ON "shopping_lists"("status");

-- ============================================
-- 2. Create shopping_list_meal_plans join table
-- ============================================

CREATE TABLE IF NOT EXISTS "shopping_list_meal_plans" (
    "id" TEXT NOT NULL,
    "shopping_list_id" TEXT NOT NULL,
    "meal_plan_id" TEXT NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_meal_plans_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint to prevent duplicate associations
ALTER TABLE "shopping_list_meal_plans"
ADD CONSTRAINT "shopping_list_meal_plans_shopping_list_id_meal_plan_id_key"
UNIQUE ("shopping_list_id", "meal_plan_id");

-- Add indexes for the join table
CREATE INDEX IF NOT EXISTS "shopping_list_meal_plans_shopping_list_id_idx" ON "shopping_list_meal_plans"("shopping_list_id");
CREATE INDEX IF NOT EXISTS "shopping_list_meal_plans_meal_plan_id_idx" ON "shopping_list_meal_plans"("meal_plan_id");

-- Add foreign key constraints
ALTER TABLE "shopping_list_meal_plans"
ADD CONSTRAINT "shopping_list_meal_plans_shopping_list_id_fkey"
FOREIGN KEY ("shopping_list_id") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shopping_list_meal_plans"
ADD CONSTRAINT "shopping_list_meal_plans_meal_plan_id_fkey"
FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- 3. Migrate existing meal_plan_id data to join table
-- ============================================

-- If there are existing shopping lists with meal_plan_id, migrate them to the join table
INSERT INTO "shopping_list_meal_plans" ("id", "shopping_list_id", "meal_plan_id", "imported_at")
SELECT
    gen_random_uuid()::TEXT,
    "id",
    "meal_plan_id",
    COALESCE("created_at", CURRENT_TIMESTAMP)
FROM "shopping_lists"
WHERE "meal_plan_id" IS NOT NULL
ON CONFLICT ("shopping_list_id", "meal_plan_id") DO NOTHING;

-- Now drop the old meal_plan_id column and its index/constraint
DROP INDEX IF EXISTS "shopping_lists_meal_plan_id_idx";
ALTER TABLE "shopping_lists" DROP CONSTRAINT IF EXISTS "shopping_lists_meal_plan_id_fkey";
ALTER TABLE "shopping_lists" DROP COLUMN IF EXISTS "meal_plan_id";

-- ============================================
-- 4. Create shopping_list_categories table
-- ============================================

CREATE TABLE IF NOT EXISTS "shopping_list_categories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_categories_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint for user + category name
ALTER TABLE "shopping_list_categories"
ADD CONSTRAINT "shopping_list_categories_user_id_name_key"
UNIQUE ("user_id", "name");

-- Add index for user lookup
CREATE INDEX IF NOT EXISTS "shopping_list_categories_user_id_idx" ON "shopping_list_categories"("user_id");

-- Add foreign key constraint
ALTER TABLE "shopping_list_categories"
ADD CONSTRAINT "shopping_list_categories_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- 5. Modify shopping_list_items table
-- ============================================

-- Add new columns to shopping_list_items
ALTER TABLE "shopping_list_items" ADD COLUMN IF NOT EXISTS "display_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "shopping_list_items" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add index on category for grouping
CREATE INDEX IF NOT EXISTS "shopping_list_items_category_idx" ON "shopping_list_items"("category");

-- ============================================
-- 6. Update existing records
-- ============================================

-- Update any 'Generated' status to 'Draft'
UPDATE "shopping_lists" SET "status" = 'Draft' WHERE "status" = 'Generated';

-- Update any 'Completed' status to 'Archived'
UPDATE "shopping_lists" SET "status" = 'Archived', "archived_at" = CURRENT_TIMESTAMP WHERE "status" = 'Completed';
