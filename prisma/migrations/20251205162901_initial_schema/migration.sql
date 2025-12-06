-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),
    "preferences" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileName" TEXT NOT NULL,
    "age" INTEGER,
    "avatarUrl" TEXT,
    "foodLikes" TEXT[],
    "foodDislikes" TEXT[],
    "allergies" JSONB NOT NULL DEFAULT '[]',
    "mealAvailability" JSONB NOT NULL DEFAULT '{}',
    "activityLevel" TEXT,
    "dailyCalorieTarget" INTEGER,
    "dailyProteinTarget" DOUBLE PRECISION,
    "dailyCarbsTarget" DOUBLE PRECISION,
    "dailyFatTarget" DOUBLE PRECISION,
    "dailyFiberTarget" DOUBLE PRECISION,
    "macroTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeName" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "servings" INTEGER NOT NULL DEFAULT 4,
    "prepTimeMinutes" INTEGER,
    "cookTimeMinutes" INTEGER,
    "totalTimeMinutes" INTEGER,
    "cuisineType" TEXT,
    "mealCategory" TEXT[],
    "difficultyLevel" TEXT,
    "recipeSource" TEXT,
    "sourceUrl" TEXT,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "timesManuallySelected" INTEGER NOT NULL DEFAULT 0,
    "lastUsedDate" TIMESTAMP(3),
    "familyRating" DOUBLE PRECISION,
    "ratingDate" TIMESTAMP(3),
    "notes" TEXT,
    "tags" TEXT[],
    "yieldsMultipleMeals" BOOLEAN NOT NULL DEFAULT false,
    "mealsYielded" INTEGER,
    "leftoverInstructions" TEXT,
    "freezable" BOOLEAN NOT NULL DEFAULT false,
    "reheatingInstructions" TEXT,
    "caloriesPerServing" INTEGER,
    "proteinPerServing" DOUBLE PRECISION,
    "carbsPerServing" DOUBLE PRECISION,
    "fatPerServing" DOUBLE PRECISION,
    "fiberPerServing" DOUBLE PRECISION,
    "sugarPerServing" DOUBLE PRECISION,
    "sodiumPerServing" INTEGER,
    "nutritionAutoCalculated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "category" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_instructions" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "timerMinutes" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "recipe_instructions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_profile_compatibility" (
    "recipeId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "isCompatible" BOOLEAN NOT NULL DEFAULT true,
    "incompatibleIngredients" TEXT[],

    CONSTRAINT "recipe_profile_compatibility_pkey" PRIMARY KEY ("recipeId","profileId")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "weekEndDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),
    "weeklyNutritionalSummary" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meals" (
    "id" TEXT NOT NULL,
    "mealPlanId" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    "recipeId" TEXT,
    "recipeName" TEXT,
    "servings" INTEGER,
    "scalingFactor" DOUBLE PRECISION,
    "isLeftover" BOOLEAN NOT NULL DEFAULT false,
    "leftoverFromMealId" TEXT,
    "notes" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "nutritionalSummary" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_participants" (
    "mealId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "portionSize" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "meal_participants_pkey" PRIMARY KEY ("mealId","profileId")
);

-- CreateTable
CREATE TABLE "weekly_staples" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "category" TEXT,
    "autoAddToList" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_staples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "autoPopulatedExpiry" BOOLEAN NOT NULL DEFAULT false,
    "dateAdded" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT NOT NULL DEFAULT 'Manual',
    "notes" TEXT,
    "isUsedInPlannedMeal" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_lists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealPlanId" TEXT,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Generated',
    "categoryOrder" TEXT[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_list_items" (
    "id" TEXT NOT NULL,
    "shoppingListId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "category" TEXT,
    "source" TEXT,
    "sourceDetails" JSONB NOT NULL DEFAULT '[]',
    "isConsolidated" BOOLEAN NOT NULL DEFAULT false,
    "inInventory" BOOLEAN NOT NULL DEFAULT false,
    "inventoryQuantity" DOUBLE PRECISION,
    "netQuantityNeeded" DOUBLE PRECISION,
    "isPurchased" BOOLEAN NOT NULL DEFAULT false,
    "customNote" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'Auto',
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "notificationPreferences" JSONB NOT NULL DEFAULT '{}',
    "mealPlanningPreferences" JSONB NOT NULL DEFAULT '{}',
    "shoppingListPreferences" JSONB NOT NULL DEFAULT '{}',
    "aiPreferences" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "family_profiles_userId_idx" ON "family_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "family_profiles_userId_profileName_key" ON "family_profiles"("userId", "profileName");

-- CreateIndex
CREATE INDEX "recipes_userId_idx" ON "recipes"("userId");

-- CreateIndex
CREATE INDEX "recipes_familyRating_idx" ON "recipes"("familyRating");

-- CreateIndex
CREATE INDEX "recipes_timesUsed_idx" ON "recipes"("timesUsed");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipeId_idx" ON "recipe_ingredients"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_instructions_recipeId_idx" ON "recipe_instructions"("recipeId");

-- CreateIndex
CREATE INDEX "meal_plans_userId_idx" ON "meal_plans"("userId");

-- CreateIndex
CREATE INDEX "meal_plans_weekStartDate_weekEndDate_idx" ON "meal_plans"("weekStartDate", "weekEndDate");

-- CreateIndex
CREATE INDEX "meals_mealPlanId_idx" ON "meals"("mealPlanId");

-- CreateIndex
CREATE INDEX "meals_recipeId_idx" ON "meals"("recipeId");

-- CreateIndex
CREATE INDEX "weekly_staples_userId_idx" ON "weekly_staples"("userId");

-- CreateIndex
CREATE INDEX "inventory_items_userId_idx" ON "inventory_items"("userId");

-- CreateIndex
CREATE INDEX "inventory_items_expiryDate_idx" ON "inventory_items"("expiryDate");

-- CreateIndex
CREATE INDEX "shopping_lists_userId_idx" ON "shopping_lists"("userId");

-- CreateIndex
CREATE INDEX "shopping_lists_mealPlanId_idx" ON "shopping_lists"("mealPlanId");

-- CreateIndex
CREATE INDEX "shopping_list_items_shoppingListId_idx" ON "shopping_list_items"("shoppingListId");

-- AddForeignKey
ALTER TABLE "family_profiles" ADD CONSTRAINT "family_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_instructions" ADD CONSTRAINT "recipe_instructions_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_profile_compatibility" ADD CONSTRAINT "recipe_profile_compatibility_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_profile_compatibility" ADD CONSTRAINT "recipe_profile_compatibility_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "family_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_leftoverFromMealId_fkey" FOREIGN KEY ("leftoverFromMealId") REFERENCES "meals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_participants" ADD CONSTRAINT "meal_participants_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_participants" ADD CONSTRAINT "meal_participants_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "family_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_staples" ADD CONSTRAINT "weekly_staples_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "meal_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_list_items" ADD CONSTRAINT "shopping_list_items_shoppingListId_fkey" FOREIGN KEY ("shoppingListId") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
