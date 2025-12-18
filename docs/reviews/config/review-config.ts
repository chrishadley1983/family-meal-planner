/**
 * Code Review Agent Configuration
 *
 * This file configures the behavior of the Code Review Agent.
 * Modify these settings to adjust review strictness, focus areas,
 * and thresholds for your project's needs.
 */

export type StrictnessLevel = 'strict' | 'moderate' | 'relaxed'

export type ReviewCategory =
  | 'correctness'
  | 'security'
  | 'performance'
  | 'maintainability'
  | 'dry'
  | 'architecture'
  | 'standards'
  | 'testing'
  | 'documentation'
  | 'accessibility'

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface ReviewRule {
  id: string
  category: ReviewCategory
  description: string
  severity: SeverityLevel
  enabled: boolean
  autoFix?: boolean
}

export interface ReviewConfig {
  // General settings
  strictness: StrictnessLevel
  enabledCategories: ReviewCategory[]

  // Path configuration
  criticalPaths: string[]
  relaxedPaths: string[]
  excludedPaths: string[]

  // Thresholds
  minCoverageNew: number
  maxComplexity: number
  maxFunctionLength: number
  maxFileLength: number
  maxNestingDepth: number

  // DRY analysis
  duplicateThreshold: number // Number of times a pattern must appear to flag as duplicate

  // Security
  secretPatterns: string[]
  allowedDomains: string[]

  // Report settings
  includePositiveFeedback: boolean
  maxIssuesPerFile: number
  groupByCategory: boolean

  // Integration
  generateTestSuggestions: boolean
  linkToDocumentation: boolean

  // Custom rules
  customRules: ReviewRule[]
}

// =============================================================================
// FAMILY MEAL PLANNER REVIEW CONFIGURATION
// =============================================================================

export const reviewConfig: ReviewConfig = {
  // General settings
  strictness: 'moderate',

  enabledCategories: [
    'correctness',
    'security',
    'performance',
    'maintainability',
    'dry',
    'architecture',
    'standards',
    'testing',
  ],

  // Critical paths - always review thoroughly regardless of strictness
  criticalPaths: [
    'app/api/auth/**',
    'app/api/meal-plans/**',
    'app/api/recipes/**',
    'lib/auth.ts',
    'lib/claude.ts',
    'lib/nutrition/**',
    'lib/meal-plan-validation.ts',
    'supabase/migrations/**',
    'prisma/schema.prisma',
  ],

  // Relaxed paths - apply less strict standards
  relaxedPaths: [
    'scripts/**',
    'tools/**',
    'docs/**',
    'tests/fixtures/**',
  ],

  // Excluded paths - skip review entirely
  excludedPaths: [
    'node_modules/**',
    '.next/**',
    'coverage/**',
    '*.min.js',
    '*.generated.ts',
    'public/fonts/**',
  ],

  // Code quality thresholds
  minCoverageNew: 80,        // % coverage required for new code
  maxComplexity: 15,         // Cyclomatic complexity threshold
  maxFunctionLength: 50,     // Lines per function
  maxFileLength: 500,        // Lines per file
  maxNestingDepth: 4,        // Maximum nesting depth

  // DRY analysis
  duplicateThreshold: 3,     // Flag pattern if appears 3+ times

  // Security patterns to detect
  secretPatterns: [
    'password\\s*[:=]',
    'secret\\s*[:=]',
    'api_key\\s*[:=]',
    'apikey\\s*[:=]',
    'token\\s*[:=]',
    'private_key',
    'SUPABASE_SERVICE_ROLE',
    'ANTHROPIC_API_KEY',
    'DATABASE_URL.*:.*@',
  ],

  // Allowed domains for hardcoded URLs
  allowedDomains: [
    'localhost',
    '127.0.0.1',
    'supabase.co',
    'vercel.app',
    'github.com',
    'anthropic.com',
  ],

  // Report settings
  includePositiveFeedback: true,
  maxIssuesPerFile: 10,      // Limit issues per file to avoid noise
  groupByCategory: true,

  // Integration with other agents
  generateTestSuggestions: true,
  linkToDocumentation: true,

  // Custom rules for Family Meal Planner
  customRules: [
    {
      id: 'fmp-001',
      category: 'correctness',
      description: 'Nutrition calculations must use lib/nutrition utilities',
      severity: 'medium',
      enabled: true,
    },
    {
      id: 'fmp-002',
      category: 'correctness',
      description: 'Recipe servings must be validated (1-50 range)',
      severity: 'medium',
      enabled: true,
    },
    {
      id: 'fmp-003',
      category: 'correctness',
      description: 'Cooldown periods must be checked in meal plan generation',
      severity: 'high',
      enabled: true,
    },
    {
      id: 'fmp-004',
      category: 'security',
      description: 'User input to Claude API must be sanitised',
      severity: 'critical',
      enabled: true,
    },
    {
      id: 'fmp-005',
      category: 'security',
      description: 'All API routes must check authentication',
      severity: 'critical',
      enabled: true,
    },
    {
      id: 'fmp-006',
      category: 'security',
      description: 'Supabase queries must filter by userId',
      severity: 'critical',
      enabled: true,
    },
    {
      id: 'fmp-007',
      category: 'performance',
      description: 'Avoid N+1 queries in meal plan loading',
      severity: 'high',
      enabled: true,
    },
    {
      id: 'fmp-008',
      category: 'performance',
      description: 'Recipe lists must be paginated',
      severity: 'medium',
      enabled: true,
    },
    {
      id: 'fmp-009',
      category: 'standards',
      description: 'All measurements must be in metric units',
      severity: 'low',
      enabled: true,
    },
    {
      id: 'fmp-010',
      category: 'standards',
      description: 'Date formatting must use UK locale',
      severity: 'low',
      enabled: true,
    },
    {
      id: 'fmp-011',
      category: 'dry',
      description: 'Loading states should use shared LoadingState component',
      severity: 'low',
      enabled: true,
    },
    {
      id: 'fmp-012',
      category: 'dry',
      description: 'Error states should use shared ErrorBoundary',
      severity: 'low',
      enabled: true,
    },
    {
      id: 'fmp-013',
      category: 'architecture',
      description: 'Custom hooks must be in hooks/ directory',
      severity: 'low',
      enabled: true,
    },
    {
      id: 'fmp-014',
      category: 'architecture',
      description: 'Shared types must be in types/ directory',
      severity: 'low',
      enabled: true,
    },
    {
      id: 'fmp-015',
      category: 'testing',
      description: 'API routes must have corresponding test file',
      severity: 'medium',
      enabled: true,
    },
  ],
}

// =============================================================================
// SHARED COMPONENT REGISTRIES
// =============================================================================

/**
 * Registry of shared UI components that should be used instead of duplicates
 */
export const sharedComponentRegistry: Record<string, string> = {
  // UI Primitives (components/ui/)
  'Button': 'All clickable actions',
  'Card': 'Content containers',
  'Dialog': 'Modal dialogs',
  'Input': 'Text inputs',
  'Select': 'Dropdown selections',
  'Skeleton': 'Loading placeholders',
  'Toast': 'Notifications',
  'Badge': 'Status indicators',
  'Tabs': 'Tabbed navigation',

  // Shared Components (components/shared/)
  'LoadingState': 'Full-page or section loading',
  'EmptyState': 'No data placeholders',
  'ErrorBoundary': 'Error catching wrappers',
  'PageHeader': 'Consistent page titles',
  'ConfirmDialog': 'Destructive action confirmation',

  // Form Components (components/forms/)
  'FormField': 'Label + input + error wrapper',
  'SearchInput': 'Search with debounce',
  'DatePicker': 'Date selection',
  'ServingsSelector': 'Portion size picker',

  // Feature Components
  'RecipeCard': 'Recipe summary display',
  'MealSlot': 'Single meal in plan',
  'IngredientRow': 'Ingredient with quantity/unit',
  'NutritionLabel': 'Nutritional info display',
}

/**
 * Registry of shared hooks that should be used instead of duplicates
 */
export const sharedHooksRegistry: Record<string, string> = {
  'useSupabaseQuery': 'Data fetching with loading/error states',
  'useDebounce': 'Debounced values',
  'useLocalStorage': 'Persistent local state',
  'useMealPlan': 'Current meal plan context',
  'useNutrition': 'Nutrition calculations',
  'useRecipes': 'Recipe list management',
  'useProfiles': 'Family profiles management',
  'useInventory': 'Inventory management',
}

/**
 * Registry of shared utilities that should be used instead of duplicates
 */
export const sharedUtilsRegistry: Record<string, string> = {
  'formatDate': 'Date formatting (UK locale)',
  'formatQuantity': 'Number + unit formatting',
  'calculateNutrition': 'Per-serving nutrition',
  'scaleIngredients': 'Adjust quantities for servings',
  'aggregateShoppingList': 'Combine duplicate ingredients',
  'validateRecipe': 'Recipe data validation',
  'normalizeIngredient': 'Ingredient name normalization',
  'convertUnits': 'Unit conversion utilities',
}

// =============================================================================
// SEVERITY CONFIGURATION
// =============================================================================

/**
 * Maps severity levels to required actions
 */
export const severityActions: Record<SeverityLevel, { mustFix: boolean; description: string }> = {
  critical: {
    mustFix: true,
    description: 'Must fix before merge - security vulnerability, data loss risk, or crash',
  },
  high: {
    mustFix: true,
    description: 'Should fix before merge - bugs likely to affect users',
  },
  medium: {
    mustFix: false,
    description: 'Fix or justify skip - code quality issues',
  },
  low: {
    mustFix: false,
    description: 'Nice to have - style issues, minor improvements',
  },
  info: {
    mustFix: false,
    description: 'No action required - suggestions, observations, praise',
  },
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a path matches any of the given glob patterns
 */
export function pathMatchesPatterns(path: string, patterns: string[]): boolean {
  // Simple glob matching - in production, use a proper glob library
  for (const pattern of patterns) {
    const regex = new RegExp(
      '^' +
        pattern
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\//g, '\\/') +
        '$'
    )
    if (regex.test(path)) {
      return true
    }
  }
  return false
}

/**
 * Get effective strictness for a file path
 */
export function getEffectiveStrictness(
  path: string,
  config: ReviewConfig
): StrictnessLevel {
  if (pathMatchesPatterns(path, config.criticalPaths)) {
    return 'strict'
  }
  if (pathMatchesPatterns(path, config.relaxedPaths)) {
    return 'relaxed'
  }
  return config.strictness
}

/**
 * Check if a path should be excluded from review
 */
export function shouldExcludePath(path: string, config: ReviewConfig): boolean {
  return pathMatchesPatterns(path, config.excludedPaths)
}

/**
 * Get enabled rules for a category
 */
export function getEnabledRules(
  category: ReviewCategory,
  config: ReviewConfig
): ReviewRule[] {
  return config.customRules.filter(
    (rule) => rule.category === category && rule.enabled
  )
}

export default reviewConfig
