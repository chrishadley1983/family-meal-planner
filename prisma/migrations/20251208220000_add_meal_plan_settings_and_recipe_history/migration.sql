-- CreateTable
CREATE TABLE "meal_plan_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "macroMode" TEXT NOT NULL DEFAULT 'balanced',
    "varietyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "dinnerCooldown" INTEGER NOT NULL DEFAULT 14,
    "lunchCooldown" INTEGER NOT NULL DEFAULT 7,
    "breakfastCooldown" INTEGER NOT NULL DEFAULT 3,
    "snackCooldown" INTEGER NOT NULL DEFAULT 2,
    "minCuisines" INTEGER NOT NULL DEFAULT 3,
    "maxSameCuisine" INTEGER NOT NULL DEFAULT 2,
    "shoppingMode" TEXT NOT NULL DEFAULT 'moderate',
    "expiryPriority" TEXT NOT NULL DEFAULT 'moderate',
    "expiryWindow" INTEGER NOT NULL DEFAULT 5,
    "useItUpItems" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "batchCookingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxLeftoverDays" INTEGER NOT NULL DEFAULT 4,
    "priorityOrder" TEXT[] DEFAULT ARRAY['macros', 'ratings', 'variety', 'shopping', 'prep', 'time']::TEXT[],
    "feedbackDetail" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plan_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_usage_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "mealPlanId" TEXT NOT NULL,
    "usedDate" TIMESTAMP(3) NOT NULL,
    "mealType" TEXT NOT NULL,
    "wasManual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_usage_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meal_plan_settings_userId_key" ON "meal_plan_settings"("userId");

-- CreateIndex
CREATE INDEX "recipe_usage_history_userId_recipeId_usedDate_idx" ON "recipe_usage_history"("userId", "recipeId", "usedDate");

-- CreateIndex
CREATE INDEX "recipe_usage_history_userId_usedDate_idx" ON "recipe_usage_history"("userId", "usedDate");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_usage_history_userId_recipeId_mealPlanId_usedDate_key" ON "recipe_usage_history"("userId", "recipeId", "mealPlanId", "usedDate");

-- AddForeignKey
ALTER TABLE "meal_plan_settings" ADD CONSTRAINT "meal_plan_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_usage_history" ADD CONSTRAINT "recipe_usage_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_usage_history" ADD CONSTRAINT "recipe_usage_history_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_usage_history" ADD CONSTRAINT "recipe_usage_history_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
