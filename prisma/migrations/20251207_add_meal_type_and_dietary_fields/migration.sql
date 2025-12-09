-- AlterTable: Rename mealCategory to mealType
ALTER TABLE "recipes" RENAME COLUMN "mealCategory" TO "mealType";

-- AlterTable: Add dietary boolean fields
ALTER TABLE "recipes"
ADD COLUMN "isVegetarian" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isVegan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "containsMeat" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "containsSeafood" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isDairyFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isGlutenFree" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "containsNuts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isQuickMeal" BOOLEAN NOT NULL DEFAULT false;
