/**
 * Project-Specific Test Configuration
 *
 * THIS IS THE ONLY FILE TO MODIFY WHEN PORTING TO A NEW PROJECT
 *
 * All project-specific paths, entities, critical journeys, and MCP configuration
 * are centralized here. The Test Plan Agent reads this configuration to:
 * - Discover features and map them to tests
 * - Identify coverage gaps
 * - Generate test manifests
 * - Recommend MCP tool usage
 */

export interface CriticalUserJourney {
  id: string
  name: string
  description: string
  entryRoute: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  steps: string[]
  expectedOutcome: string
  requiresAuth: boolean
  mcpTools: ('playwright' | 'supabase' | 'nextDevtools')[]
}

export interface DatabaseEntity {
  name: string
  tableName: string
  hasCRUD: boolean
  apiRoutes: string[]
  criticalFields: string[]
}

export interface FeatureModule {
  id: string
  name: string
  description: string
  libFiles: string[]
  apiRoutes: string[]
  components: string[]
  testFiles: string[]
  priority: 'critical' | 'high' | 'medium' | 'low'
}

export interface MCPServerConfig {
  name: string
  available: boolean
  capabilities: string[]
  useCases: string[]
  installCommand?: string
}

export interface TestExecutionMode {
  id: string
  name: string
  description: string
  includeTypes: ('unit' | 'api' | 'integration' | 'e2e')[]
  includeFeatures?: string[]  // Feature IDs to include (empty = all)
  excludeFeatures?: string[]  // Feature IDs to exclude
  coverageRequired: boolean
  coverageThresholds?: {
    branches: number
    functions: number
    lines: number
    statements: number
  }
  mcpValidation: boolean
  timeout: number  // seconds
  parallelExecution: boolean
}

export interface ProjectConfig {
  // Project identity
  project: {
    name: string
    version: string
    description: string
    repository: string
  }

  // Source code locations
  paths: {
    root: string
    apiRoutes: string
    libModules: string
    components: string
    pages: string
    tests: {
      unit: string
      api: string
      integration: string
      e2e: string
    }
    testOutput: string
    coverageOutput: string
  }

  // Test framework configuration
  testFramework: {
    name: 'jest' | 'vitest' | 'mocha'
    configFile: string
    runCommand: string
    runUnitCommand: string
    runIntegrationCommand: string
    runE2ECommand: string
    coverageCommand: string
    ciCommand: string
  }

  // Critical user journeys for E2E testing
  criticalUserJourneys: CriticalUserJourney[]

  // Database entities to validate
  databaseEntities: DatabaseEntity[]

  // Feature modules (maps features to code and tests)
  featureModules: FeatureModule[]

  // MCP servers configuration
  mcpServers: MCPServerConfig[]

  // Test execution modes
  executionModes: TestExecutionMode[]

  // History retention
  historyRetentionDays: number

  // Coverage targets
  coverageTargets: {
    unit: { branches: number; functions: number; lines: number; statements: number }
    integration: { branches: number; functions: number; lines: number; statements: number }
    overall: { branches: number; functions: number; lines: number; statements: number }
  }
}

// =============================================================================
// FAMILY MEAL PLANNER CONFIGURATION
// =============================================================================

export const projectConfig: ProjectConfig = {
  project: {
    name: 'Family Meal Planner',
    version: '1.0.0',
    description: 'Comprehensive family meal planning application with AI-powered features',
    repository: 'https://github.com/chrishadley1983/family-meal-planner',
  },

  paths: {
    root: 'c:/Users/Chris Hadley/family-meal-planner',
    apiRoutes: 'app/api',
    libModules: 'lib',
    components: 'components',
    pages: 'app',
    tests: {
      unit: 'tests/unit',
      api: 'tests/api',
      integration: 'tests/integration',
      e2e: 'tests/e2e',
    },
    testOutput: 'docs/testing/execution-history',
    coverageOutput: 'coverage',
  },

  testFramework: {
    name: 'jest',
    configFile: 'jest.config.js',
    runCommand: 'npm test',
    runUnitCommand: 'npm run test:unit',
    runIntegrationCommand: 'npm run test:integration',
    runE2ECommand: 'npm run test:e2e',
    coverageCommand: 'npm run test:coverage',
    ciCommand: 'npm run test:ci',
  },

  criticalUserJourneys: [
    {
      id: 'cuj-001',
      name: 'User Registration & Login',
      description: 'New user registers and logs into the application',
      entryRoute: '/auth/register',
      priority: 'critical',
      steps: [
        'Navigate to registration page',
        'Fill in email, password, name',
        'Submit registration form',
        'Verify redirect to dashboard',
        'Verify user session created',
      ],
      expectedOutcome: 'User is authenticated and sees dashboard',
      requiresAuth: false,
      mcpTools: ['playwright', 'supabase'],
    },
    {
      id: 'cuj-002',
      name: 'Recipe Import from URL',
      description: 'User imports a recipe from an external website',
      entryRoute: '/recipes/new',
      priority: 'critical',
      steps: [
        'Navigate to new recipe page',
        'Enter recipe URL',
        'Click import button',
        'Wait for AI parsing',
        'Review parsed recipe details',
        'Save recipe',
        'Verify recipe in database',
      ],
      expectedOutcome: 'Recipe is saved with correct ingredients and instructions',
      requiresAuth: true,
      mcpTools: ['playwright', 'supabase', 'nextDevtools'],
    },
    {
      id: 'cuj-003',
      name: 'Manual Recipe Creation',
      description: 'User creates a recipe manually',
      entryRoute: '/recipes/new',
      priority: 'high',
      steps: [
        'Navigate to new recipe page',
        'Fill recipe name, description',
        'Add ingredients with quantities',
        'Add cooking instructions',
        'Set prep/cook time',
        'Save recipe',
      ],
      expectedOutcome: 'Recipe is saved with all fields correctly stored',
      requiresAuth: true,
      mcpTools: ['playwright', 'supabase'],
    },
    {
      id: 'cuj-004',
      name: 'Weekly Meal Plan Generation',
      description: 'User generates an AI-powered weekly meal plan',
      entryRoute: '/meal-plans/new',
      priority: 'critical',
      steps: [
        'Navigate to new meal plan page',
        'Select week start date',
        'Configure meal preferences',
        'Click generate button',
        'Wait for AI generation',
        'Review generated plan',
        'Save meal plan',
      ],
      expectedOutcome: 'Valid meal plan respecting cooldowns and dietary restrictions',
      requiresAuth: true,
      mcpTools: ['playwright', 'supabase', 'nextDevtools'],
    },
    {
      id: 'cuj-005',
      name: 'Shopping List from Meal Plan',
      description: 'User generates a shopping list from their meal plan',
      entryRoute: '/meal-plans',
      priority: 'critical',
      steps: [
        'View active meal plan',
        'Click "Generate Shopping List"',
        'Review aggregated ingredients',
        'Adjust quantities if needed',
        'Save shopping list',
      ],
      expectedOutcome: 'Shopping list with correctly aggregated and categorized items',
      requiresAuth: true,
      mcpTools: ['playwright', 'supabase'],
    },
    {
      id: 'cuj-006',
      name: 'Shopping List PDF Export',
      description: 'User exports shopping list as PDF',
      entryRoute: '/shopping-lists',
      priority: 'high',
      steps: [
        'View shopping list',
        'Click export to PDF',
        'Verify PDF downloads',
        'Verify PDF content matches list',
      ],
      expectedOutcome: 'PDF file with formatted shopping list',
      requiresAuth: true,
      mcpTools: ['playwright'],
    },
    {
      id: 'cuj-007',
      name: 'Inventory Management',
      description: 'User adds and tracks inventory items',
      entryRoute: '/inventory',
      priority: 'high',
      steps: [
        'Navigate to inventory page',
        'Add new item manually',
        'Set quantity, expiry date, location',
        'Save item',
        'View item in list',
        'Edit item quantity',
        'Delete item',
      ],
      expectedOutcome: 'Inventory accurately reflects user actions',
      requiresAuth: true,
      mcpTools: ['playwright', 'supabase'],
    },
    {
      id: 'cuj-008',
      name: 'Photo-based Inventory Import',
      description: 'User imports inventory by taking a photo',
      entryRoute: '/inventory',
      priority: 'medium',
      steps: [
        'Click "Import from Photo"',
        'Upload/capture photo',
        'Wait for AI recognition',
        'Review detected items',
        'Confirm and save',
      ],
      expectedOutcome: 'Items recognized from photo added to inventory',
      requiresAuth: true,
      mcpTools: ['playwright', 'supabase', 'nextDevtools'],
    },
    {
      id: 'cuj-009',
      name: 'Nutritionist Chat',
      description: 'User interacts with AI nutritionist',
      entryRoute: '/nutritionist',
      priority: 'high',
      steps: [
        'Navigate to nutritionist page',
        'Start new conversation',
        'Ask nutrition question',
        'Receive AI response',
        'View suggested actions',
        'Apply an action (e.g., adjust recipe)',
      ],
      expectedOutcome: 'Contextual nutrition advice with actionable suggestions',
      requiresAuth: true,
      mcpTools: ['playwright', 'supabase', 'nextDevtools'],
    },
    {
      id: 'cuj-010',
      name: 'Recipe Discovery',
      description: 'User discovers and adds recipes from master database',
      entryRoute: '/discover',
      priority: 'medium',
      steps: [
        'Navigate to discover page',
        'Apply filters (cuisine, dietary)',
        'Browse recipes',
        'View recipe details',
        'Add recipe to collection',
      ],
      expectedOutcome: 'Recipe copied to user collection',
      requiresAuth: true,
      mcpTools: ['playwright', 'supabase'],
    },
    {
      id: 'cuj-011',
      name: 'Family Profile Management',
      description: 'User manages family member profiles',
      entryRoute: '/profiles',
      priority: 'high',
      steps: [
        'Navigate to profiles page',
        'Add new family member',
        'Set dietary restrictions, allergies',
        'Set calorie/macro goals',
        'Save profile',
        'Edit existing profile',
      ],
      expectedOutcome: 'Profile data used in meal planning',
      requiresAuth: true,
      mcpTools: ['playwright', 'supabase'],
    },
    {
      id: 'cuj-012',
      name: 'Staples Management',
      description: 'User manages recurring staple items',
      entryRoute: '/staples',
      priority: 'medium',
      steps: [
        'Navigate to staples page',
        'Add new staple item',
        'Set purchase frequency',
        'View due staples',
        'Mark as purchased',
      ],
      expectedOutcome: 'Staples appear on shopping lists when due',
      requiresAuth: true,
      mcpTools: ['playwright', 'supabase'],
    },
  ],

  databaseEntities: [
    {
      name: 'User',
      tableName: 'User',
      hasCRUD: true,
      apiRoutes: ['/api/auth/register', '/api/auth/[...nextauth]'],
      criticalFields: ['id', 'email', 'password', 'name'],
    },
    {
      name: 'Recipe',
      tableName: 'Recipe',
      hasCRUD: true,
      apiRoutes: ['/api/recipes', '/api/recipes/[id]'],
      criticalFields: ['id', 'recipeName', 'ingredients', 'instructions', 'userId'],
    },
    {
      name: 'MealPlan',
      tableName: 'MealPlan',
      hasCRUD: true,
      apiRoutes: ['/api/meal-plans', '/api/meal-plans/[id]'],
      criticalFields: ['id', 'weekStartDate', 'status', 'userId'],
    },
    {
      name: 'Meal',
      tableName: 'Meal',
      hasCRUD: true,
      apiRoutes: ['/api/meals', '/api/meals/[id]'],
      criticalFields: ['id', 'mealPlanId', 'recipeId', 'dayOfWeek', 'mealType'],
    },
    {
      name: 'ShoppingList',
      tableName: 'ShoppingList',
      hasCRUD: true,
      apiRoutes: ['/api/shopping-lists', '/api/shopping-lists/[id]'],
      criticalFields: ['id', 'name', 'userId', 'status'],
    },
    {
      name: 'ShoppingListItem',
      tableName: 'ShoppingListItem',
      hasCRUD: true,
      apiRoutes: ['/api/shopping-lists/[id]/items'],
      criticalFields: ['id', 'shoppingListId', 'ingredientName', 'quantity'],
    },
    {
      name: 'Inventory',
      tableName: 'InventoryItem',
      hasCRUD: true,
      apiRoutes: ['/api/inventory', '/api/inventory/[id]'],
      criticalFields: ['id', 'itemName', 'quantity', 'expiryDate', 'userId'],
    },
    {
      name: 'Profile',
      tableName: 'Profile',
      hasCRUD: true,
      apiRoutes: ['/api/profiles', '/api/profiles/[id]'],
      criticalFields: ['id', 'name', 'userId', 'dietaryRestrictions'],
    },
    {
      name: 'Staple',
      tableName: 'Staple',
      hasCRUD: true,
      apiRoutes: ['/api/staples'],
      criticalFields: ['id', 'itemName', 'frequencyDays', 'userId'],
    },
    {
      name: 'NutritionistConversation',
      tableName: 'NutritionistConversation',
      hasCRUD: true,
      apiRoutes: ['/api/nutritionist/conversations', '/api/nutritionist/conversations/[id]'],
      criticalFields: ['id', 'userId', 'messages'],
    },
  ],

  featureModules: [
    {
      id: 'fm-auth',
      name: 'Authentication',
      description: 'User registration, login, session management',
      libFiles: ['lib/auth.ts'],
      apiRoutes: ['app/api/auth/register/route.ts', 'app/api/auth/[...nextauth]/route.ts'],
      components: [],
      testFiles: [],
      priority: 'critical',
    },
    {
      id: 'fm-recipes',
      name: 'Recipe Management',
      description: 'CRUD operations, import (URL/photo/text), favorites, duplication',
      libFiles: ['lib/claude.ts', 'lib/recipe-helpers.ts', 'lib/scraping/index.ts'],
      apiRoutes: [
        'app/api/recipes/route.ts',
        'app/api/recipes/[id]/route.ts',
        'app/api/recipes/import-url/route.ts',
        'app/api/recipes/import-photo/route.ts',
        'app/api/recipes/import-text/route.ts',
        'app/api/recipes/[id]/favorite/route.ts',
        'app/api/recipes/[id]/duplicate/route.ts',
      ],
      components: ['components/recipes/'],
      testFiles: ['tests/api/recipes.test.ts'],
      priority: 'critical',
    },
    {
      id: 'fm-meal-plans',
      name: 'Meal Planning',
      description: 'AI-powered meal plan generation, validation, regeneration',
      libFiles: [
        'lib/meal-plan-validation.ts',
        'lib/meal-plan-prompt-builder.ts',
        'lib/meal-utils.ts',
        'lib/claude.ts',
      ],
      apiRoutes: [
        'app/api/meal-plans/route.ts',
        'app/api/meal-plans/[id]/route.ts',
        'app/api/meal-plans/generate/route.ts',
        'app/api/meal-plans/[id]/regenerate/route.ts',
        'app/api/meal-plans/[id]/status/route.ts',
        'app/api/meal-plans/copy/route.ts',
      ],
      components: ['components/meal-plan/'],
      testFiles: ['tests/api/meal-plans.test.ts', 'tests/unit/meal-plan-validation.test.ts'],
      priority: 'critical',
    },
    {
      id: 'fm-shopping-lists',
      name: 'Shopping Lists',
      description: 'List generation, item management, sharing, PDF export',
      libFiles: ['lib/types/shopping-list.ts', 'lib/export/generatePDF.ts'],
      apiRoutes: [
        'app/api/shopping-lists/route.ts',
        'app/api/shopping-lists/[id]/route.ts',
        'app/api/shopping-lists/[id]/items/route.ts',
        'app/api/shopping-lists/[id]/share/route.ts',
        'app/api/shopping-lists/[id]/import/meal-plan/route.ts',
        'app/api/shopping-lists/[id]/import/staples/route.ts',
        'app/api/shopping-lists/[id]/deduplicate/route.ts',
        'app/api/shopping-lists/[id]/convert-to-inventory/route.ts',
        'app/api/shopping-lists/categories/route.ts',
        'app/api/shopping-lists/suggest-category/route.ts',
        'app/api/shared/shopping-list/[token]/route.ts',
        'app/api/shared/shopping-list/[token]/pdf/route.ts',
      ],
      components: ['components/shopping-list/'],
      testFiles: ['tests/api/shopping-lists.test.ts'],
      priority: 'critical',
    },
    {
      id: 'fm-inventory',
      name: 'Inventory Management',
      description: 'Item tracking, expiry calculations, photo import, cooking deduction',
      libFiles: [
        'lib/inventory/index.ts',
        'lib/inventory/expiry-calculations.ts',
        'lib/inventory/shelf-life-lookup.ts',
        'lib/inventory/duplicate-detection.ts',
        'lib/inventory/inventory-deduction.ts',
        'lib/inventory/cooking-deduction.ts',
        'lib/inventory/inventory-check.ts',
      ],
      apiRoutes: [
        'app/api/inventory/route.ts',
        'app/api/inventory/photo/route.ts',
        'app/api/inventory/import-photo/route.ts',
        'app/api/inventory/import/route.ts',
        'app/api/inventory/check/route.ts',
        'app/api/inventory/deduct/route.ts',
        'app/api/inventory/from-shopping-list/route.ts',
        'app/api/inventory/settings/route.ts',
        'app/api/inventory/url/route.ts',
      ],
      components: ['components/inventory/'],
      testFiles: [
        'tests/api/inventory.test.ts',
        'tests/unit/expiry-calculations.test.ts',
        'tests/unit/inventory-normalization-edge-cases.test.ts',
      ],
      priority: 'high',
    },
    {
      id: 'fm-profiles',
      name: 'Family Profiles',
      description: 'Family member management, dietary restrictions, goals',
      libFiles: [],
      apiRoutes: ['app/api/profiles/route.ts', 'app/api/profiles/[id]/route.ts'],
      components: ['components/profiles/'],
      testFiles: ['tests/api/profiles.test.ts'],
      priority: 'high',
    },
    {
      id: 'fm-nutritionist',
      name: 'AI Nutritionist',
      description: 'Chat interface, nutrition analysis, actionable suggestions',
      libFiles: [
        'lib/nutritionist/index.ts',
        'lib/nutritionist/calculations.ts',
        'lib/nutritionist/analysis.ts',
        'lib/nutritionist/actions.ts',
        'lib/nutritionist/prompts.ts',
        'lib/nutritionist/master-recipe-search.ts',
      ],
      apiRoutes: [
        'app/api/nutritionist/chat/route.ts',
        'app/api/nutritionist/conversations/route.ts',
        'app/api/nutritionist/conversations/[id]/route.ts',
        'app/api/nutritionist/apply-action/route.ts',
        'app/api/nutritionist/suggested-prompts/route.ts',
        'app/api/recipes/nutritionist-feedback/route.ts',
        'app/api/recipes/nutritionist-chat/route.ts',
      ],
      components: ['components/nutritionist/'],
      testFiles: [
        'tests/api/nutritionist.test.ts',
        'tests/unit/nutritionist-calculations.test.ts',
        'tests/unit/master-recipe-search.test.ts',
      ],
      priority: 'high',
    },
    {
      id: 'fm-nutrition',
      name: 'Nutrition Calculations',
      description: 'Macro analysis, USDA API integration, nutrition caching',
      libFiles: [
        'lib/nutrition/index.ts',
        'lib/nutrition/nutrition-service.ts',
        'lib/nutrition/usda-api.ts',
        'lib/nutrition/nutrition-cache.ts',
        'lib/nutrition/ingredient-weights.ts',
      ],
      apiRoutes: [
        'app/api/recipes/analyze-macros/route.ts',
        'app/api/recipes/calculate-nutrition/route.ts',
        'app/api/recipes/backfill-nutrition/route.ts',
        'app/api/recipes/[id]/sync-macros/route.ts',
      ],
      components: [],
      testFiles: [
        'tests/unit/nutrition-validation.test.ts',
        'tests/unit/macro-consistency.test.ts',
        'tests/unit/database-macro-sync.test.ts',
      ],
      priority: 'high',
    },
    {
      id: 'fm-staples',
      name: 'Staples Management',
      description: 'Recurring item tracking, due date calculations',
      libFiles: [
        'lib/staples/calculations.ts',
        'lib/staples/csv-parser.ts',
        'lib/staples/csv-validator.ts',
      ],
      apiRoutes: [
        'app/api/staples/route.ts',
        'app/api/staples/photo/route.ts',
        'app/api/staples/url/route.ts',
      ],
      components: [],
      testFiles: ['tests/unit/staples-calculations.test.ts'],
      priority: 'medium',
    },
    {
      id: 'fm-discover',
      name: 'Recipe Discovery',
      description: 'Master recipe browsing, filtering, adding to collection',
      libFiles: ['lib/scraping/discovery.ts', 'lib/scraping/quality-score.ts'],
      apiRoutes: [
        'app/api/discover/recipes/route.ts',
        'app/api/discover/recipes/[id]/route.ts',
        'app/api/discover/recipes/add/route.ts',
        'app/api/discover/recipes/add-bulk/route.ts',
        'app/api/discover/filters/route.ts',
        'app/api/discover/assistant/route.ts',
      ],
      components: ['components/discover/'],
      testFiles: [],
      priority: 'medium',
    },
    {
      id: 'fm-units',
      name: 'Unit Conversion',
      description: 'Metric/imperial conversion, unit compatibility',
      libFiles: [
        'lib/unit-conversion.ts',
        'lib/measurements.ts',
        'lib/units/convert-recipe-to-metric.ts',
        'lib/units/seed-units.ts',
      ],
      apiRoutes: [
        'app/api/units/route.ts',
        'app/api/units/migrate/route.ts',
        'app/api/units/seed/route.ts',
      ],
      components: [],
      testFiles: ['tests/unit/unit-conversion.test.ts'],
      priority: 'medium',
    },
    {
      id: 'fm-ingredients',
      name: 'Ingredient Processing',
      description: 'Normalization, UK/US synonyms, preparation stripping',
      libFiles: ['lib/ingredient-normalization.ts', 'lib/category-lookup.ts'],
      apiRoutes: [],
      components: [],
      testFiles: [
        'tests/unit/ingredient-normalization.test.ts',
        'tests/unit/ingredient-state.test.ts',
      ],
      priority: 'medium',
    },
    {
      id: 'fm-pdf-export',
      name: 'PDF Export',
      description: 'Meal plan and cooking plan PDF generation',
      libFiles: [
        'lib/export/generatePDF.ts',
        'lib/export/generateMealPlanPDF.ts',
        'lib/export/generateCookingPlanPDF.ts',
      ],
      apiRoutes: [
        'app/api/meal-plans/[id]/pdf/route.ts',
        'app/api/meal-plans/[id]/cooking-plan-pdf/route.ts',
      ],
      components: [],
      testFiles: [],
      priority: 'medium',
    },
    {
      id: 'fm-dashboard',
      name: 'Dashboard',
      description: 'Overview metrics, quick actions',
      libFiles: [],
      apiRoutes: ['app/api/dashboard/route.ts'],
      components: ['components/dashboard/'],
      testFiles: ['tests/api/dashboard.test.ts'],
      priority: 'medium',
    },
    {
      id: 'fm-meals',
      name: 'Meal Operations',
      description: 'Individual meal management, cooking workflow',
      libFiles: [],
      apiRoutes: ['app/api/meals/route.ts', 'app/api/meals/[id]/route.ts', 'app/api/meals/[id]/cook/route.ts'],
      components: [],
      testFiles: [],
      priority: 'medium',
    },
    {
      id: 'fm-settings',
      name: 'Settings',
      description: 'Meal planning settings, cooldown configuration',
      libFiles: ['lib/types/meal-plan-settings.ts'],
      apiRoutes: ['app/api/settings/meal-planning/route.ts'],
      components: [],
      testFiles: ['tests/unit/meal-plan-settings.test.ts'],
      priority: 'low',
    },
  ],

  mcpServers: [
    {
      name: 'playwright',
      available: true,
      capabilities: [
        'browser-navigation',
        'form-filling',
        'screenshot-capture',
        'element-clicking',
        'text-input',
        'accessibility-snapshot',
        'console-monitoring',
        'network-monitoring',
        'file-upload',
        'drag-and-drop',
      ],
      useCases: [
        'E2E user journey testing',
        'Visual regression testing',
        'Form submission verification',
        'Navigation flow testing',
        'Screenshot comparison',
        'Accessibility testing',
      ],
    },
    {
      name: 'supabase',
      available: true,
      capabilities: [
        'sql-execution',
        'table-listing',
        'schema-inspection',
        'migration-management',
        'data-querying',
        'typescript-generation',
      ],
      useCases: [
        'Database state verification',
        'Test data seeding',
        'Schema validation',
        'Data integrity checks',
        'Migration verification',
      ],
    },
    {
      name: 'nextDevtools',
      available: true,
      capabilities: [
        'build-error-detection',
        'runtime-error-detection',
        'typescript-error-monitoring',
        'component-inspection',
        'route-listing',
      ],
      useCases: [
        'Build health validation',
        'Runtime error detection during E2E',
        'TypeScript compilation verification',
        'Route existence verification',
      ],
    },
    {
      name: 'visual-regression',
      available: false,
      capabilities: ['pixel-comparison', 'baseline-management', 'diff-generation'],
      useCases: ['UI consistency verification', 'Design regression detection'],
      installCommand: 'npm install -D @playwright/test pixelmatch',
    },
    {
      name: 'lighthouse',
      available: false,
      capabilities: ['performance-audit', 'accessibility-audit', 'seo-audit', 'best-practices-audit'],
      useCases: ['Performance regression testing', 'Accessibility compliance', 'SEO verification'],
      installCommand: 'npm install -D lighthouse',
    },
  ],

  executionModes: [
    {
      id: 'quick',
      name: 'Quick Check',
      description: 'Fast validation of critical paths only - unit tests for critical features',
      includeTypes: ['unit'],
      includeFeatures: ['fm-auth', 'fm-recipes', 'fm-meal-plans', 'fm-shopping-lists'],
      coverageRequired: false,
      mcpValidation: false,
      timeout: 60,
      parallelExecution: true,
    },
    {
      id: 'unit',
      name: 'Unit Tests Only',
      description: 'All unit tests without integration or E2E',
      includeTypes: ['unit'],
      coverageRequired: true,
      coverageThresholds: { branches: 60, functions: 70, lines: 70, statements: 70 },
      mcpValidation: false,
      timeout: 120,
      parallelExecution: true,
    },
    {
      id: 'api',
      name: 'API Tests Only',
      description: 'All API endpoint tests with mocked database',
      includeTypes: ['api'],
      coverageRequired: true,
      coverageThresholds: { branches: 50, functions: 60, lines: 60, statements: 60 },
      mcpValidation: false,
      timeout: 180,
      parallelExecution: true,
    },
    {
      id: 'integration',
      name: 'Integration Tests',
      description: 'API and integration tests together',
      includeTypes: ['api', 'integration'],
      coverageRequired: true,
      coverageThresholds: { branches: 50, functions: 60, lines: 60, statements: 60 },
      mcpValidation: true,
      timeout: 300,
      parallelExecution: false,
    },
    {
      id: 'e2e',
      name: 'E2E Tests Only',
      description: 'End-to-end browser tests using Playwright MCP',
      includeTypes: ['e2e'],
      coverageRequired: false,
      mcpValidation: true,
      timeout: 600,
      parallelExecution: false,
    },
    {
      id: 'e2e-critical',
      name: 'Critical E2E Only',
      description: 'E2E tests for critical user journeys only',
      includeTypes: ['e2e'],
      includeFeatures: ['fm-auth', 'fm-recipes', 'fm-meal-plans', 'fm-shopping-lists'],
      coverageRequired: false,
      mcpValidation: true,
      timeout: 300,
      parallelExecution: false,
    },
    {
      id: 'regression',
      name: 'Regression Suite',
      description: 'Full regression - unit, API, and integration tests',
      includeTypes: ['unit', 'api', 'integration'],
      coverageRequired: true,
      coverageThresholds: { branches: 60, functions: 70, lines: 70, statements: 70 },
      mcpValidation: true,
      timeout: 600,
      parallelExecution: false,
    },
    {
      id: 'complete',
      name: 'Complete Suite',
      description: 'All tests including E2E - full validation',
      includeTypes: ['unit', 'api', 'integration', 'e2e'],
      coverageRequired: true,
      coverageThresholds: { branches: 70, functions: 80, lines: 80, statements: 80 },
      mcpValidation: true,
      timeout: 900,
      parallelExecution: false,
    },
    {
      id: 'smoke',
      name: 'Smoke Test',
      description: 'Minimal validation that app is functional - build + critical E2E',
      includeTypes: ['e2e'],
      includeFeatures: ['fm-auth', 'fm-recipes'],
      coverageRequired: false,
      mcpValidation: true,
      timeout: 120,
      parallelExecution: false,
    },
    {
      id: 'pre-merge',
      name: 'Pre-Merge Validation',
      description: 'Tests to run before merging - regression + critical E2E',
      includeTypes: ['unit', 'api', 'integration', 'e2e'],
      includeFeatures: ['fm-auth', 'fm-recipes', 'fm-meal-plans', 'fm-shopping-lists', 'fm-inventory'],
      coverageRequired: true,
      coverageThresholds: { branches: 60, functions: 70, lines: 70, statements: 70 },
      mcpValidation: true,
      timeout: 600,
      parallelExecution: false,
    },
    {
      id: 'feature-specific',
      name: 'Feature-Specific',
      description: 'Tests for a specific feature module (set includeFeatures)',
      includeTypes: ['unit', 'api', 'integration', 'e2e'],
      includeFeatures: [], // Set dynamically
      coverageRequired: false,
      mcpValidation: true,
      timeout: 300,
      parallelExecution: false,
    },
  ],

  historyRetentionDays: 30,

  coverageTargets: {
    unit: { branches: 80, functions: 85, lines: 85, statements: 85 },
    integration: { branches: 60, functions: 70, lines: 70, statements: 70 },
    overall: { branches: 70, functions: 80, lines: 80, statements: 80 },
  },
}

export default projectConfig
