/**
 * Test Data Fixtures
 * Reusable test data for all test suites
 */

import type { MealPlanSettings } from '@/lib/types/meal-plan-settings'
import type { GeneratedMeal, RecipeUsageHistoryItem } from '@/lib/meal-plan-validation'
import type { InventoryItem, InventoryItemWithExpiry } from '@/lib/types/inventory'
import type { StapleFrequency, StapleWithDueStatus } from '@/lib/types/staples'

// ============================================================================
// MEAL PLAN TEST DATA
// ============================================================================

export const testMealPlanSettings: MealPlanSettings = {
  macroMode: 'balanced',
  varietyEnabled: true,
  dinnerCooldown: 14,
  lunchCooldown: 7,
  breakfastCooldown: 3,
  snackCooldown: 2,
  minCuisines: 3,
  maxSameCuisine: 2,
  shoppingMode: 'moderate',
  expiryPriority: 'moderate',
  expiryWindow: 5,
  useItUpItems: [],
  batchCookingEnabled: true,
  maxLeftoverDays: 4,
  priorityOrder: ['macros', 'ratings', 'variety', 'shopping', 'prep', 'time'],
  feedbackDetail: 'medium',
  allowDinnerForLunch: true,
}

export const testMealsValid: GeneratedMeal[] = [
  {
    dayOfWeek: 'Monday',
    mealType: 'dinner',
    recipeId: 'recipe-1',
    recipeName: 'Chicken Stir Fry',
    servings: 4,
    notes: 'Batch cook - make 8 servings',
    isLeftover: false,
  },
  {
    dayOfWeek: 'Tuesday',
    mealType: 'dinner',
    recipeId: 'recipe-2',
    recipeName: 'Beef Tacos',
    servings: 4,
  },
  {
    dayOfWeek: 'Wednesday',
    mealType: 'dinner',
    recipeId: 'recipe-1',
    recipeName: 'Chicken Stir Fry',
    servings: 4,
    isLeftover: true,
    batchCookSourceDay: 'Monday',
  },
  {
    dayOfWeek: 'Thursday',
    mealType: 'dinner',
    recipeId: 'recipe-3',
    recipeName: 'Salmon Pasta',
    servings: 4,
  },
]

export const testMealsCooldownViolation: GeneratedMeal[] = [
  {
    dayOfWeek: 'Monday',
    mealType: 'dinner',
    recipeId: 'recipe-1',
    recipeName: 'Chicken Stir Fry',
    servings: 4,
    isLeftover: false,
  },
  {
    dayOfWeek: 'Wednesday',
    mealType: 'dinner',
    recipeId: 'recipe-1',
    recipeName: 'Chicken Stir Fry',
    servings: 4,
    isLeftover: false, // NOT marked as leftover - violation
  },
]

export const testMealsBatchCookingError: GeneratedMeal[] = [
  {
    dayOfWeek: 'Monday', // First occurrence (earliest day after sorting)
    mealType: 'dinner',
    recipeId: 'recipe-1',
    recipeName: 'Chicken Stir Fry',
    servings: 4,
    isLeftover: true, // ERROR: First occurrence should NOT be marked as leftover
  },
  {
    dayOfWeek: 'Wednesday',
    mealType: 'dinner',
    recipeId: 'recipe-1',
    recipeName: 'Chicken Stir Fry',
    servings: 4,
    isLeftover: true,
    batchCookSourceDay: 'Monday',
  },
]

export const testRecipeHistory: RecipeUsageHistoryItem[] = [
  {
    recipeId: 'recipe-5',
    usedDate: new Date('2024-01-05'),
    mealType: 'dinner',
  },
  {
    recipeId: 'recipe-6',
    usedDate: new Date('2024-01-03'),
    mealType: 'lunch',
  },
]

// ============================================================================
// INVENTORY TEST DATA
// ============================================================================

export const testInventoryItems: InventoryItem[] = [
  {
    id: 'inv-1',
    userId: 'user-1',
    itemName: 'Chicken Breast',
    quantity: 500,
    unit: 'g',
    category: 'Meat & Fish',
    location: 'fridge',
    purchaseDate: new Date('2024-01-08'),
    expiryDate: new Date('2024-01-12'),
    expiryIsEstimated: false,
    isActive: true,
    addedBy: 'manual',
    notes: null,
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-08'),
  },
  {
    id: 'inv-2',
    userId: 'user-1',
    itemName: 'Milk',
    quantity: 1,
    unit: 'L',
    category: 'Dairy & Eggs',
    location: 'fridge',
    purchaseDate: new Date('2024-01-08'),
    expiryDate: new Date('2024-01-15'),
    expiryIsEstimated: false,
    isActive: true,
    addedBy: 'manual',
    notes: null,
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-08'),
  },
  {
    id: 'inv-3',
    userId: 'user-1',
    itemName: 'Rice',
    quantity: 1,
    unit: 'kg',
    category: 'Cupboard Staples',
    location: 'pantry',
    purchaseDate: new Date('2024-01-01'),
    expiryDate: null,
    expiryIsEstimated: false,
    isActive: true,
    addedBy: 'manual',
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'inv-4',
    userId: 'user-1',
    itemName: 'Yoghurt',
    quantity: 500,
    unit: 'g',
    category: 'Dairy & Eggs',
    location: 'fridge',
    purchaseDate: new Date('2024-01-05'),
    expiryDate: new Date('2024-01-08'), // Expired
    expiryIsEstimated: false,
    isActive: true,
    addedBy: 'manual',
    notes: null,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
]

export const testInventoryItemWithExpiry: InventoryItemWithExpiry = {
  ...testInventoryItems[0],
  daysUntilExpiry: 4,
  shelfLifeDays: 4,
  expiryStatus: 'expiringSoon',
}

// ============================================================================
// STAPLES TEST DATA
// ============================================================================

export const testStaples: StapleWithDueStatus[] = [
  {
    id: 'staple-1',
    userId: 'user-1',
    itemName: 'Olive Oil',
    quantity: 1,
    unit: 'bottle',
    category: 'Cupboard Staples',
    frequency: 'every_4_weeks' as StapleFrequency,
    isActive: true,
    lastAddedDate: new Date('2024-01-01'),
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    nextDueDate: new Date('2024-01-29'),
    dueStatus: 'notDue',
    daysUntilDue: 21,
  },
  {
    id: 'staple-2',
    userId: 'user-1',
    itemName: 'Bread',
    quantity: 1,
    unit: 'loaf',
    category: 'Bakery',
    frequency: 'weekly' as StapleFrequency,
    isActive: true,
    lastAddedDate: new Date('2024-01-06'),
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-06'),
    nextDueDate: new Date('2024-01-13'),
    dueStatus: 'dueSoon',
    daysUntilDue: 5,
  },
  {
    id: 'staple-3',
    userId: 'user-1',
    itemName: 'Eggs',
    quantity: 12,
    unit: 'each',
    category: 'Dairy & Eggs',
    frequency: 'weekly' as StapleFrequency,
    isActive: true,
    lastAddedDate: null, // Never added
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    nextDueDate: null,
    dueStatus: 'dueToday',
    daysUntilDue: 0,
  },
]

// ============================================================================
// RECIPE TEST DATA
// ============================================================================

export const testRecipes = [
  {
    id: 'recipe-1',
    userId: 'user-1',
    recipeName: 'Chicken Stir Fry',
    description: 'Quick and healthy chicken stir fry',
    servings: 4,
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    caloriesPerServing: 450,
    proteinPerServing: 35,
    carbsPerServing: 30,
    fatPerServing: 18,
    isVegetarian: false,
    isVegan: false,
    isDairyFree: true,
    isGlutenFree: true,
    isNutFree: true,
    tags: ['asian', 'quick', 'healthy'],
    cuisineType: 'Asian',
    isActive: true,
    isFavorite: true,
    source: 'manual',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'recipe-2',
    userId: 'user-1',
    recipeName: 'Beef Tacos',
    description: 'Mexican-style beef tacos',
    servings: 4,
    prepTimeMinutes: 20,
    cookTimeMinutes: 15,
    caloriesPerServing: 520,
    proteinPerServing: 28,
    carbsPerServing: 45,
    fatPerServing: 24,
    isVegetarian: false,
    isVegan: false,
    isDairyFree: false,
    isGlutenFree: false,
    isNutFree: true,
    tags: ['mexican', 'quick'],
    cuisineType: 'Mexican',
    isActive: true,
    isFavorite: false,
    source: 'manual',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
]

export const testRecipeIngredients = [
  {
    id: 'ing-1',
    recipeId: 'recipe-1',
    ingredientName: 'Chicken Breast',
    quantity: 500,
    unit: 'g',
    notes: 'sliced',
    sortOrder: 1,
  },
  {
    id: 'ing-2',
    recipeId: 'recipe-1',
    ingredientName: 'Soy Sauce',
    quantity: 2,
    unit: 'tbsp',
    notes: null,
    sortOrder: 2,
  },
  {
    id: 'ing-3',
    recipeId: 'recipe-1',
    ingredientName: 'Mixed Vegetables',
    quantity: 400,
    unit: 'g',
    notes: null,
    sortOrder: 3,
  },
]

// ============================================================================
// NUTRITION TEST DATA
// ============================================================================

export const testNutritionData = {
  perServing: {
    calories: 450,
    protein: 35,
    carbs: 30,
    fat: 18,
    fiber: 5,
    sugar: 8,
    sodium: 650,
  },
  total: {
    calories: 1800,
    protein: 140,
    carbs: 120,
    fat: 72,
    fiber: 20,
    sugar: 32,
    sodium: 2600,
  },
}

// ============================================================================
// PROFILE TEST DATA
// ============================================================================

export const testProfiles = [
  {
    id: 'profile-1',
    userId: 'user-1',
    profileName: 'Chris',
    age: 40,
    gender: 'male',
    allergies: [],
    dietaryPreferences: null,
    foodLikes: ['pasta', 'chicken'],
    foodDislikes: ['mushrooms'],
    isActive: true,
    macroTrackingEnabled: true,
    caloriesTarget: 2200,
    proteinTarget: 165,
    carbsTarget: 220,
    fatTarget: 73,
    fiberTarget: 30,
    weightKg: 85,
    heightCm: 180,
    activityLevel: 'moderate',
    goalType: 'lose',
    targetWeightKg: 80,
    goalTimeframeWeeks: 12,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'profile-2',
    userId: 'user-1',
    profileName: 'Sarah',
    age: 38,
    gender: 'female',
    allergies: ['nuts'],
    dietaryPreferences: 'vegetarian',
    foodLikes: ['salads', 'pasta'],
    foodDislikes: [],
    isActive: true,
    macroTrackingEnabled: true,
    caloriesTarget: 1800,
    proteinTarget: 90,
    carbsTarget: 200,
    fatTarget: 60,
    fiberTarget: 28,
    weightKg: 65,
    heightCm: 165,
    activityLevel: 'light',
    goalType: 'maintain',
    targetWeightKg: null,
    goalTimeframeWeeks: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
]

// ============================================================================
// UNIT CONVERSION TEST DATA
// ============================================================================

export const testUnitConversions = [
  { quantity: 1, unit: 'cup', expected: { quantity: 236.59, unit: 'ml' } },
  { quantity: 2, unit: 'tbsp', expected: { quantity: 29.57, unit: 'ml' } },
  { quantity: 1, unit: 'oz', expected: { quantity: 28.35, unit: 'g' } },
  { quantity: 1, unit: 'lb', expected: { quantity: 453.59, unit: 'g' } },
  { quantity: 500, unit: 'g', expected: { quantity: 500, unit: 'g' } },
  { quantity: 2, unit: 'L', expected: { quantity: 2000, unit: 'ml' } },
]

// ============================================================================
// INGREDIENT NORMALIZATION TEST DATA
// ============================================================================

export const testIngredientNormalization = [
  // UK/US synonyms
  { input: 'eggplant', expected: 'aubergine' },
  { input: 'zucchini', expected: 'courgette' },
  { input: 'cilantro', expected: 'coriander' },
  { input: 'ground beef', expected: 'beef mince' },
  { input: 'shrimp', expected: 'prawn' },
  { input: 'heavy cream', expected: 'double cream' },
  { input: 'all-purpose flour', expected: 'flour' }, // "plain" gets stripped as modifier

  // Preparation stripping
  { input: 'diced onion', expected: 'onion' },
  { input: 'chopped garlic', expected: 'garlic' },
  { input: 'fresh basil', expected: 'basil' },
  { input: 'organic chicken breast', expected: 'chicken' },

  // Plurals
  { input: 'tomatoes', expected: 'tomato' },
  { input: 'potatoes', expected: 'potato' },
  { input: 'carrots', expected: 'carrot' },
]

export default {
  testMealPlanSettings,
  testMealsValid,
  testMealsCooldownViolation,
  testMealsBatchCookingError,
  testRecipeHistory,
  testInventoryItems,
  testInventoryItemWithExpiry,
  testStaples,
  testRecipes,
  testRecipeIngredients,
  testNutritionData,
  testProfiles,
  testUnitConversions,
  testIngredientNormalization,
}
