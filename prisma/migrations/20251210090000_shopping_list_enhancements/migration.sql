-- Shopping List Enhancements Migration
-- Adds support for named shopping lists, notes, multiple meal plan associations,
-- user-customizable categories, and improved item management

-- ============================================
-- 1. Modify shopping_lists table
-- ============================================

-- Add new columns to shopping_lists
ALTER TABLE "shopping_lists" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT 'Shopping List';
ALTER TABLE "shopping_lists" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "shopping_lists" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "shopping_lists" ADD COLUMN IF NOT EXISTS "finalizedAt" TIMESTAMP(3);
ALTER TABLE "shopping_lists" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- Rename generatedAt to createdAt for consistency (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopping_lists' AND column_name = 'generatedAt') THEN
        ALTER TABLE "shopping_lists" RENAME COLUMN "generatedAt" TO "createdAt";
    END IF;
END $$;

-- Drop the old completedAt column (replaced by status + archivedAt)
ALTER TABLE "shopping_lists" DROP COLUMN IF EXISTS "completedAt";

-- Update status default from 'Generated' to 'Draft'
ALTER TABLE "shopping_lists" ALTER COLUMN "status" SET DEFAULT 'Draft';

-- Make weekStartDate optional (nullable)
ALTER TABLE "shopping_lists" ALTER COLUMN "weekStartDate" DROP NOT NULL;

-- Add index on status for filtering
CREATE INDEX IF NOT EXISTS "shopping_lists_status_idx" ON "shopping_lists"("status");

-- ============================================
-- 2. Create shopping_list_meal_plans join table
-- ============================================

CREATE TABLE IF NOT EXISTS "shopping_list_meal_plans" (
    "id" TEXT NOT NULL,
    "shoppingListId" TEXT NOT NULL,
    "mealPlanId" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_meal_plans_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint to prevent duplicate associations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shopping_list_meal_plans_shoppingListId_mealPlanId_key') THEN
        ALTER TABLE "shopping_list_meal_plans"
        ADD CONSTRAINT "shopping_list_meal_plans_shoppingListId_mealPlanId_key"
        UNIQUE ("shoppingListId", "mealPlanId");
    END IF;
END $$;

-- Add indexes for the join table
CREATE INDEX IF NOT EXISTS "shopping_list_meal_plans_shoppingListId_idx" ON "shopping_list_meal_plans"("shoppingListId");
CREATE INDEX IF NOT EXISTS "shopping_list_meal_plans_mealPlanId_idx" ON "shopping_list_meal_plans"("mealPlanId");

-- Add foreign key constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shopping_list_meal_plans_shoppingListId_fkey') THEN
        ALTER TABLE "shopping_list_meal_plans"
        ADD CONSTRAINT "shopping_list_meal_plans_shoppingListId_fkey"
        FOREIGN KEY ("shoppingListId") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shopping_list_meal_plans_mealPlanId_fkey') THEN
        ALTER TABLE "shopping_list_meal_plans"
        ADD CONSTRAINT "shopping_list_meal_plans_mealPlanId_fkey"
        FOREIGN KEY ("mealPlanId") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- 3. Migrate existing mealPlanId data to join table
-- ============================================

-- If there are existing shopping lists with mealPlanId, migrate them to the join table
INSERT INTO "shopping_list_meal_plans" ("id", "shoppingListId", "mealPlanId", "importedAt")
SELECT
    gen_random_uuid()::TEXT,
    "id",
    "mealPlanId",
    COALESCE("createdAt", CURRENT_TIMESTAMP)
FROM "shopping_lists"
WHERE "mealPlanId" IS NOT NULL
ON CONFLICT ("shoppingListId", "mealPlanId") DO NOTHING;

-- Now drop the old mealPlanId column and its index/constraint
DROP INDEX IF EXISTS "shopping_lists_mealPlanId_idx";
ALTER TABLE "shopping_lists" DROP CONSTRAINT IF EXISTS "shopping_lists_mealPlanId_fkey";
ALTER TABLE "shopping_lists" DROP COLUMN IF EXISTS "mealPlanId";

-- ============================================
-- 4. Create shopping_list_categories table
-- ============================================

CREATE TABLE IF NOT EXISTS "shopping_list_categories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_categories_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint for user + category name
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shopping_list_categories_userId_name_key') THEN
        ALTER TABLE "shopping_list_categories"
        ADD CONSTRAINT "shopping_list_categories_userId_name_key"
        UNIQUE ("userId", "name");
    END IF;
END $$;

-- Add index for user lookup
CREATE INDEX IF NOT EXISTS "shopping_list_categories_userId_idx" ON "shopping_list_categories"("userId");

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shopping_list_categories_userId_fkey') THEN
        ALTER TABLE "shopping_list_categories"
        ADD CONSTRAINT "shopping_list_categories_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- 5. Modify shopping_list_items table
-- ============================================

-- Add new columns to shopping_list_items
ALTER TABLE "shopping_list_items" ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "shopping_list_items" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add index on category for grouping
CREATE INDEX IF NOT EXISTS "shopping_list_items_category_idx" ON "shopping_list_items"("category");

-- ============================================
-- 6. Update existing records
-- ============================================

-- Update any 'Generated' status to 'Draft'
UPDATE "shopping_lists" SET "status" = 'Draft' WHERE "status" = 'Generated';

-- Update any 'Completed' status to 'Archived'
UPDATE "shopping_lists" SET "status" = 'Archived', "archivedAt" = CURRENT_TIMESTAMP WHERE "status" = 'Completed';
