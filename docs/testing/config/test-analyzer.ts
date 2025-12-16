/**
 * Test Analyzer Module
 *
 * Provides functions to:
 * - Discover and inventory existing tests
 * - Map features to tests
 * - Identify coverage gaps
 * - Generate analysis reports
 * - Validate MCP tool usage
 *
 * Used by the Test Plan Agent to assess test coverage and make recommendations.
 */

import { projectConfig, FeatureModule, CriticalUserJourney } from './project-config'

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface TestFile {
  path: string
  relativePath: string
  type: 'unit' | 'api' | 'integration' | 'e2e'
  featureModule?: string
  testCount: number
  testNames: string[]
  lastModified: string
}

export interface FeatureCoverage {
  featureId: string
  featureName: string
  priority: string
  libFiles: { path: string; covered: boolean }[]
  apiRoutes: { path: string; covered: boolean }[]
  components: { path: string; covered: boolean }[]
  unitTests: string[]
  apiTests: string[]
  integrationTests: string[]
  e2eTests: string[]
  coverageScore: number // 0-100
  gaps: CoverageGap[]
  recommendations: string[]
}

export interface CoverageGap {
  type: 'missing_unit' | 'missing_api' | 'missing_integration' | 'missing_e2e' | 'low_coverage' | 'untested_route' | 'untested_function'
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  file?: string
  recommendation: string
}

export interface MCPCapabilityAudit {
  server: string
  available: boolean
  capabilities: string[]
  currentUsage: string[]
  unusedCapabilities: string[]
  recommendations: string[]
  suggestedNewServers: SuggestedMCPServer[]
}

export interface SuggestedMCPServer {
  name: string
  reason: string
  capabilities: string[]
  installCommand: string
  useCases: string[]
}

export interface TestManifest {
  generatedAt: string
  generatedBy: string
  mode: string
  projectName: string
  tests: TestManifestEntry[]
  executionOrder: string[]
  coverageTargets: {
    branches: number
    functions: number
    lines: number
    statements: number
  }
  mcpRequired: string[]
  estimatedDuration: number // seconds
}

export interface TestManifestEntry {
  id: string
  type: 'unit' | 'api' | 'integration' | 'e2e'
  file: string
  featureModule: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimatedDuration: number // seconds
  dependencies: string[]
  mcpRequired: string[]
  runInParallel: boolean
}

export interface AnalysisReport {
  generatedAt: string
  projectName: string
  summary: {
    totalFeatures: number
    totalTests: number
    overallCoverageScore: number
    criticalGaps: number
    highGaps: number
    mediumGaps: number
    lowGaps: number
  }
  featureCoverage: FeatureCoverage[]
  mcpAudit: MCPCapabilityAudit[]
  recommendations: PrioritizedRecommendation[]
  testInventory: TestFile[]
}

export interface PrioritizedRecommendation {
  priority: number
  category: 'coverage' | 'mcp' | 'infrastructure' | 'documentation'
  title: string
  description: string
  effort: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  action: string
}

// =============================================================================
// TEST DISCOVERY FUNCTIONS
// =============================================================================

/**
 * Discovers all test files in the project
 * This function would scan the filesystem - here we provide the structure
 */
export function discoverTestFiles(): TestFile[] {
  // In practice, this would use glob to find all test files
  // For now, we return the known test structure based on project exploration

  return [
    // Unit Tests
    {
      path: 'tests/unit/meal-plan-validation.test.ts',
      relativePath: 'tests/unit/meal-plan-validation.test.ts',
      type: 'unit',
      featureModule: 'fm-meal-plans',
      testCount: 25,
      testNames: [
        'getDayIndex - Monday start week',
        'getDayIndex - Sunday start week',
        'validateCooldowns - valid plan',
        'validateCooldowns - cooldown violation',
        'validateBatchCooking - correct setup',
        'validateBatchCooking - first occurrence leftover error',
        'validateMealPlan - combined validation',
      ],
      lastModified: '2024-01-15',
    },
    {
      path: 'tests/unit/unit-conversion.test.ts',
      relativePath: 'tests/unit/unit-conversion.test.ts',
      type: 'unit',
      featureModule: 'fm-units',
      testCount: 15,
      testNames: [
        'volume conversions',
        'weight conversions',
        'non-convertible units',
        'unit compatibility',
      ],
      lastModified: '2024-01-10',
    },
    {
      path: 'tests/unit/expiry-calculations.test.ts',
      relativePath: 'tests/unit/expiry-calculations.test.ts',
      type: 'unit',
      featureModule: 'fm-inventory',
      testCount: 12,
      testNames: [
        'days until expiry',
        'shelf life calculation',
        'expiry status',
        'filtering by status',
      ],
      lastModified: '2024-01-12',
    },
    {
      path: 'tests/unit/ingredient-normalization.test.ts',
      relativePath: 'tests/unit/ingredient-normalization.test.ts',
      type: 'unit',
      featureModule: 'fm-ingredients',
      testCount: 18,
      testNames: [
        'UK/US synonym mapping',
        'preparation stripping',
        'modifier stripping',
        'plural normalization',
        'duplicate detection',
      ],
      lastModified: '2024-01-08',
    },
    {
      path: 'tests/unit/staples-calculations.test.ts',
      relativePath: 'tests/unit/staples-calculations.test.ts',
      type: 'unit',
      featureModule: 'fm-staples',
      testCount: 10,
      testNames: [
        'frequency days calculation',
        'due date calculation',
        'status determination',
      ],
      lastModified: '2024-01-05',
    },
    {
      path: 'tests/unit/nutritionist-calculations.test.ts',
      relativePath: 'tests/unit/nutritionist-calculations.test.ts',
      type: 'unit',
      featureModule: 'fm-nutritionist',
      testCount: 14,
      testNames: [
        'BMR calculation',
        'TDEE with activity',
        'macro calculation',
        'deficit limits',
      ],
      lastModified: '2024-01-14',
    },
    {
      path: 'tests/unit/meal-plan-settings.test.ts',
      relativePath: 'tests/unit/meal-plan-settings.test.ts',
      type: 'unit',
      featureModule: 'fm-settings',
      testCount: 8,
      testNames: [
        'cooldown helpers',
        'pantry staples',
        'leftover shelf life',
      ],
      lastModified: '2024-01-11',
    },
    {
      path: 'tests/unit/nutrition-validation.test.ts',
      relativePath: 'tests/unit/nutrition-validation.test.ts',
      type: 'unit',
      featureModule: 'fm-nutrition',
      testCount: 10,
      testNames: ['macro validation', 'calorie bounds'],
      lastModified: '2024-01-13',
    },
    {
      path: 'tests/unit/macro-consistency.test.ts',
      relativePath: 'tests/unit/macro-consistency.test.ts',
      type: 'unit',
      featureModule: 'fm-nutrition',
      testCount: 8,
      testNames: ['macro totals', 'consistency checks'],
      lastModified: '2024-01-13',
    },
    {
      path: 'tests/unit/database-macro-sync.test.ts',
      relativePath: 'tests/unit/database-macro-sync.test.ts',
      type: 'unit',
      featureModule: 'fm-nutrition',
      testCount: 6,
      testNames: ['sync validation', 'cache invalidation'],
      lastModified: '2024-01-13',
    },
    {
      path: 'tests/unit/master-recipe-search.test.ts',
      relativePath: 'tests/unit/master-recipe-search.test.ts',
      type: 'unit',
      featureModule: 'fm-nutritionist',
      testCount: 8,
      testNames: ['search matching', 'relevance scoring'],
      lastModified: '2024-01-14',
    },
    {
      path: 'tests/unit/inventory-normalization-edge-cases.test.ts',
      relativePath: 'tests/unit/inventory-normalization-edge-cases.test.ts',
      type: 'unit',
      featureModule: 'fm-inventory',
      testCount: 12,
      testNames: ['edge cases', 'boundary conditions'],
      lastModified: '2024-01-12',
    },
    {
      path: 'tests/unit/ingredient-state.test.ts',
      relativePath: 'tests/unit/ingredient-state.test.ts',
      type: 'unit',
      featureModule: 'fm-ingredients',
      testCount: 6,
      testNames: ['state transitions', 'state validation'],
      lastModified: '2024-01-08',
    },
    {
      path: 'tests/unit/emilia-arithmetic.test.ts',
      relativePath: 'tests/unit/emilia-arithmetic.test.ts',
      type: 'unit',
      featureModule: 'fm-profiles',
      testCount: 5,
      testNames: ['age calculations', 'special handling'],
      lastModified: '2024-01-06',
    },

    // API Tests
    {
      path: 'tests/api/recipes.test.ts',
      relativePath: 'tests/api/recipes.test.ts',
      type: 'api',
      featureModule: 'fm-recipes',
      testCount: 20,
      testNames: [
        'GET /api/recipes',
        'GET /api/recipes/[id]',
        'POST /api/recipes',
        'PUT /api/recipes/[id]',
        'DELETE /api/recipes/[id]',
      ],
      lastModified: '2024-01-15',
    },
    {
      path: 'tests/api/meal-plans.test.ts',
      relativePath: 'tests/api/meal-plans.test.ts',
      type: 'api',
      featureModule: 'fm-meal-plans',
      testCount: 18,
      testNames: [
        'GET /api/meal-plans',
        'POST /api/meal-plans',
        'meal plan generation',
      ],
      lastModified: '2024-01-15',
    },
    {
      path: 'tests/api/profiles.test.ts',
      relativePath: 'tests/api/profiles.test.ts',
      type: 'api',
      featureModule: 'fm-profiles',
      testCount: 12,
      testNames: ['CRUD operations', 'dietary restrictions'],
      lastModified: '2024-01-10',
    },
    {
      path: 'tests/api/inventory.test.ts',
      relativePath: 'tests/api/inventory.test.ts',
      type: 'api',
      featureModule: 'fm-inventory',
      testCount: 15,
      testNames: ['CRUD operations', 'expiry tracking'],
      lastModified: '2024-01-12',
    },
    {
      path: 'tests/api/shopping-lists.test.ts',
      relativePath: 'tests/api/shopping-lists.test.ts',
      type: 'api',
      featureModule: 'fm-shopping-lists',
      testCount: 16,
      testNames: ['CRUD operations', 'item management'],
      lastModified: '2024-01-14',
    },
    {
      path: 'tests/api/dashboard.test.ts',
      relativePath: 'tests/api/dashboard.test.ts',
      type: 'api',
      featureModule: 'fm-dashboard',
      testCount: 8,
      testNames: ['dashboard data', 'metrics'],
      lastModified: '2024-01-09',
    },
    {
      path: 'tests/api/nutritionist.test.ts',
      relativePath: 'tests/api/nutritionist.test.ts',
      type: 'api',
      featureModule: 'fm-nutritionist',
      testCount: 14,
      testNames: ['chat endpoint', 'conversations'],
      lastModified: '2024-01-14',
    },

    // Integration Tests
    {
      path: 'tests/integration/api-mock-test.test.ts',
      relativePath: 'tests/integration/api-mock-test.test.ts',
      type: 'integration',
      featureModule: undefined,
      testCount: 25,
      testNames: ['API integration scenarios'],
      lastModified: '2024-01-15',
    },
  ]
}

// =============================================================================
// COVERAGE ANALYSIS FUNCTIONS
// =============================================================================

/**
 * Analyzes test coverage for all feature modules
 */
export function analyzeFeatureCoverage(testFiles: TestFile[]): FeatureCoverage[] {
  const coverage: FeatureCoverage[] = []

  for (const feature of projectConfig.featureModules) {
    const featureCoverage = analyzeFeature(feature, testFiles)
    coverage.push(featureCoverage)
  }

  return coverage
}

/**
 * Analyzes test coverage for a single feature
 */
function analyzeFeature(feature: FeatureModule, testFiles: TestFile[]): FeatureCoverage {
  const featureTests = testFiles.filter(t => t.featureModule === feature.id)

  const unitTests = featureTests.filter(t => t.type === 'unit').map(t => t.path)
  const apiTests = featureTests.filter(t => t.type === 'api').map(t => t.path)
  const integrationTests = featureTests.filter(t => t.type === 'integration').map(t => t.path)
  const e2eTests = featureTests.filter(t => t.type === 'e2e').map(t => t.path)

  // Calculate coverage for lib files
  const libCoverage = feature.libFiles.map(file => ({
    path: file,
    covered: unitTests.length > 0, // Simplified - would need actual coverage data
  }))

  // Calculate coverage for API routes
  const apiCoverage = feature.apiRoutes.map(route => ({
    path: route,
    covered: apiTests.length > 0 || integrationTests.length > 0,
  }))

  // Calculate coverage for components
  const componentCoverage = feature.components.map(comp => ({
    path: comp,
    covered: e2eTests.length > 0,
  }))

  // Identify gaps
  const gaps: CoverageGap[] = []

  // Check for missing unit tests
  if (feature.libFiles.length > 0 && unitTests.length === 0) {
    gaps.push({
      type: 'missing_unit',
      severity: feature.priority === 'critical' ? 'critical' : feature.priority === 'high' ? 'high' : 'medium',
      description: `No unit tests for ${feature.name} business logic`,
      recommendation: `Create unit tests in tests/unit/${feature.id.replace('fm-', '')}.test.ts`,
    })
  }

  // Check for missing API tests
  if (feature.apiRoutes.length > 0 && apiTests.length === 0) {
    gaps.push({
      type: 'missing_api',
      severity: feature.priority === 'critical' ? 'critical' : 'high',
      description: `No API tests for ${feature.name} endpoints`,
      recommendation: `Create API tests in tests/api/${feature.id.replace('fm-', '')}.test.ts`,
    })
  }

  // Check for missing E2E tests for critical features
  if ((feature.priority === 'critical' || feature.priority === 'high') && e2eTests.length === 0) {
    gaps.push({
      type: 'missing_e2e',
      severity: feature.priority === 'critical' ? 'high' : 'medium',
      description: `No E2E tests for ${feature.name} user journeys`,
      recommendation: `Create E2E test spec in tests/e2e/${feature.id.replace('fm-', '')}.spec.ts`,
    })
  }

  // Check for untested API routes
  for (const route of feature.apiRoutes) {
    const routeName = route.split('/').pop()?.replace('.ts', '') || route
    const hasTest = apiTests.some(test => test.includes(routeName))
    if (!hasTest) {
      gaps.push({
        type: 'untested_route',
        severity: 'medium',
        description: `API route ${route} has no dedicated test`,
        file: route,
        recommendation: `Add test coverage for ${route}`,
      })
    }
  }

  // Calculate coverage score
  const totalItems = feature.libFiles.length + feature.apiRoutes.length + feature.components.length
  const coveredItems = libCoverage.filter(c => c.covered).length +
    apiCoverage.filter(c => c.covered).length +
    componentCoverage.filter(c => c.covered).length

  const coverageScore = totalItems > 0 ? Math.round((coveredItems / totalItems) * 100) : 0

  // Generate recommendations
  const recommendations: string[] = []
  if (gaps.some(g => g.type === 'missing_unit')) {
    recommendations.push(`Add unit tests for ${feature.name} to improve confidence in business logic`)
  }
  if (gaps.some(g => g.type === 'missing_api')) {
    recommendations.push(`Add API tests to verify endpoint contracts for ${feature.name}`)
  }
  if (gaps.some(g => g.type === 'missing_e2e') && feature.priority === 'critical') {
    recommendations.push(`Create E2E tests for ${feature.name} - this is a critical user journey`)
  }

  return {
    featureId: feature.id,
    featureName: feature.name,
    priority: feature.priority,
    libFiles: libCoverage,
    apiRoutes: apiCoverage,
    components: componentCoverage,
    unitTests,
    apiTests,
    integrationTests,
    e2eTests,
    coverageScore,
    gaps,
    recommendations,
  }
}

// =============================================================================
// MCP AUDIT FUNCTIONS
// =============================================================================

/**
 * Audits MCP server usage and provides recommendations
 */
export function auditMCPCapabilities(testFiles: TestFile[]): MCPCapabilityAudit[] {
  const audits: MCPCapabilityAudit[] = []

  for (const server of projectConfig.mcpServers) {
    const audit: MCPCapabilityAudit = {
      server: server.name,
      available: server.available,
      capabilities: server.capabilities,
      currentUsage: [],
      unusedCapabilities: [],
      recommendations: [],
      suggestedNewServers: [],
    }

    // Analyze current usage based on test types
    if (server.name === 'playwright') {
      const e2eTests = testFiles.filter(t => t.type === 'e2e')
      if (e2eTests.length === 0) {
        audit.currentUsage = []
        audit.unusedCapabilities = server.capabilities
        audit.recommendations.push('No E2E tests exist - Playwright MCP is not being utilized')
        audit.recommendations.push('Create E2E tests to leverage browser automation capabilities')
      } else {
        audit.currentUsage = ['browser-navigation', 'form-filling', 'screenshot-capture']
        audit.unusedCapabilities = ['accessibility-snapshot', 'console-monitoring', 'network-monitoring']
        audit.recommendations.push('Consider using accessibility snapshots for better element targeting')
        audit.recommendations.push('Add console monitoring to catch client-side errors during E2E')
      }
    }

    if (server.name === 'supabase') {
      audit.currentUsage = ['sql-execution', 'table-listing']
      audit.unusedCapabilities = ['migration-management', 'typescript-generation']
      audit.recommendations.push('Use Supabase MCP to verify database state after E2E operations')
      audit.recommendations.push('Consider using migration management for schema change testing')
    }

    if (server.name === 'nextDevtools') {
      audit.currentUsage = ['build-error-detection']
      audit.unusedCapabilities = ['runtime-error-detection', 'component-inspection', 'route-listing']
      audit.recommendations.push('Integrate runtime error detection into E2E test workflow')
      audit.recommendations.push('Use route listing to automatically discover testable endpoints')
    }

    // Check for suggested new servers
    if (!server.available) {
      audit.suggestedNewServers.push({
        name: server.name,
        reason: `${server.name} MCP would enable ${server.useCases.join(', ')}`,
        capabilities: server.capabilities,
        installCommand: server.installCommand || 'Contact admin for installation',
        useCases: server.useCases,
      })
    }

    audits.push(audit)
  }

  // Suggest additional MCP servers based on project needs
  const hasE2ETests = testFiles.some(t => t.type === 'e2e')
  if (hasE2ETests) {
    const visualRegressionServer = projectConfig.mcpServers.find(s => s.name === 'visual-regression')
    if (visualRegressionServer && !visualRegressionServer.available) {
      audits[0].suggestedNewServers.push({
        name: 'visual-regression',
        reason: 'Project has E2E tests - visual regression would catch UI changes',
        capabilities: ['pixel-comparison', 'baseline-management', 'diff-generation'],
        installCommand: 'npm install -D @playwright/test pixelmatch',
        useCases: ['UI consistency verification', 'Design regression detection'],
      })
    }
  }

  return audits
}

// =============================================================================
// MANIFEST GENERATION
// =============================================================================

/**
 * Generates a test manifest for the Test Execution Agent
 */
export function generateTestManifest(
  mode: string,
  testFiles: TestFile[],
  featureCoverage: FeatureCoverage[]
): TestManifest {
  const executionMode = projectConfig.executionModes.find(m => m.id === mode)
  if (!executionMode) {
    throw new Error(`Unknown execution mode: ${mode}`)
  }

  // Filter tests by mode
  let filteredTests = testFiles.filter(t => executionMode.includeTypes.includes(t.type))

  // Filter by feature if specified
  if (executionMode.includeFeatures && executionMode.includeFeatures.length > 0) {
    filteredTests = filteredTests.filter(t =>
      !t.featureModule || executionMode.includeFeatures!.includes(t.featureModule)
    )
  }

  // Exclude features if specified
  if (executionMode.excludeFeatures && executionMode.excludeFeatures.length > 0) {
    filteredTests = filteredTests.filter(t =>
      !t.featureModule || !executionMode.excludeFeatures!.includes(t.featureModule)
    )
  }

  // Build manifest entries
  const entries: TestManifestEntry[] = filteredTests.map(test => {
    const feature = projectConfig.featureModules.find(f => f.id === test.featureModule)
    const priority = feature?.priority || 'medium'

    return {
      id: test.relativePath.replace(/[\/\\]/g, '-').replace('.test.ts', ''),
      type: test.type,
      file: test.relativePath,
      featureModule: test.featureModule || 'general',
      priority: priority as 'critical' | 'high' | 'medium' | 'low',
      estimatedDuration: estimateTestDuration(test),
      dependencies: [],
      mcpRequired: test.type === 'e2e' ? ['playwright'] : [],
      runInParallel: executionMode.parallelExecution && test.type === 'unit',
    }
  })

  // Sort by priority and type
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  const typeOrder = { unit: 0, api: 1, integration: 2, e2e: 3 }

  entries.sort((a, b) => {
    const typeCompare = typeOrder[a.type] - typeOrder[b.type]
    if (typeCompare !== 0) return typeCompare
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  // Calculate total estimated duration
  const totalDuration = entries.reduce((sum, e) => sum + e.estimatedDuration, 0)

  // Determine required MCP servers
  const mcpRequired = [...new Set(entries.flatMap(e => e.mcpRequired))]

  return {
    generatedAt: new Date().toISOString(),
    generatedBy: 'test-plan-agent',
    mode: executionMode.id,
    projectName: projectConfig.project.name,
    tests: entries,
    executionOrder: executionMode.includeTypes,
    coverageTargets: executionMode.coverageThresholds || {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
    mcpRequired,
    estimatedDuration: totalDuration,
  }
}

/**
 * Estimates test duration based on test type and count
 */
function estimateTestDuration(test: TestFile): number {
  const basePerTest = {
    unit: 0.5,      // 0.5 seconds per unit test
    api: 2,         // 2 seconds per API test
    integration: 3, // 3 seconds per integration test
    e2e: 30,        // 30 seconds per E2E test
  }

  return Math.round(test.testCount * basePerTest[test.type])
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

/**
 * Generates a comprehensive analysis report
 */
export function generateAnalysisReport(): AnalysisReport {
  const testFiles = discoverTestFiles()
  const featureCoverage = analyzeFeatureCoverage(testFiles)
  const mcpAudit = auditMCPCapabilities(testFiles)

  // Calculate summary
  const allGaps = featureCoverage.flatMap(fc => fc.gaps)
  const criticalGaps = allGaps.filter(g => g.severity === 'critical').length
  const highGaps = allGaps.filter(g => g.severity === 'high').length
  const mediumGaps = allGaps.filter(g => g.severity === 'medium').length
  const lowGaps = allGaps.filter(g => g.severity === 'low').length

  const overallScore = featureCoverage.reduce((sum, fc) => sum + fc.coverageScore, 0) / featureCoverage.length

  // Generate prioritized recommendations
  const recommendations = generatePrioritizedRecommendations(featureCoverage, mcpAudit, allGaps)

  return {
    generatedAt: new Date().toISOString(),
    projectName: projectConfig.project.name,
    summary: {
      totalFeatures: featureCoverage.length,
      totalTests: testFiles.reduce((sum, t) => sum + t.testCount, 0),
      overallCoverageScore: Math.round(overallScore),
      criticalGaps,
      highGaps,
      mediumGaps,
      lowGaps,
    },
    featureCoverage,
    mcpAudit,
    recommendations,
    testInventory: testFiles,
  }
}

/**
 * Generates prioritized recommendations based on analysis
 */
function generatePrioritizedRecommendations(
  featureCoverage: FeatureCoverage[],
  mcpAudit: MCPCapabilityAudit[],
  gaps: CoverageGap[]
): PrioritizedRecommendation[] {
  const recommendations: PrioritizedRecommendation[] = []
  let priority = 1

  // Critical coverage gaps first
  const criticalGaps = gaps.filter(g => g.severity === 'critical')
  for (const gap of criticalGaps) {
    recommendations.push({
      priority: priority++,
      category: 'coverage',
      title: `Critical: ${gap.description}`,
      description: gap.description,
      effort: gap.type === 'missing_unit' ? 'medium' : 'high',
      impact: 'high',
      action: gap.recommendation,
    })
  }

  // E2E test creation for critical journeys
  const e2eGaps = featureCoverage.filter(fc =>
    fc.priority === 'critical' && fc.e2eTests.length === 0
  )
  if (e2eGaps.length > 0) {
    recommendations.push({
      priority: priority++,
      category: 'coverage',
      title: 'Create E2E tests for critical user journeys',
      description: `${e2eGaps.length} critical features lack E2E test coverage`,
      effort: 'high',
      impact: 'high',
      action: 'Use the E2E test template to create browser tests for: ' +
        e2eGaps.map(g => g.featureName).join(', '),
    })
  }

  // MCP utilization recommendations
  for (const audit of mcpAudit) {
    if (audit.unusedCapabilities.length > 0 && audit.available) {
      recommendations.push({
        priority: priority++,
        category: 'mcp',
        title: `Utilize ${audit.server} capabilities`,
        description: `${audit.unusedCapabilities.length} capabilities are not being used`,
        effort: 'low',
        impact: 'medium',
        action: audit.recommendations.join('; '),
      })
    }
  }

  // High priority gaps
  const highGaps = gaps.filter(g => g.severity === 'high')
  for (const gap of highGaps.slice(0, 3)) { // Top 3 high gaps
    recommendations.push({
      priority: priority++,
      category: 'coverage',
      title: gap.description,
      description: gap.description,
      effort: 'medium',
      impact: 'medium',
      action: gap.recommendation,
    })
  }

  // Infrastructure improvements
  recommendations.push({
    priority: priority++,
    category: 'infrastructure',
    title: 'Set up test execution history tracking',
    description: 'Track test execution results over time for trend analysis',
    effort: 'low',
    impact: 'medium',
    action: 'Ensure Test Execution Agent writes results to docs/testing/execution-history/',
  })

  return recommendations
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Gets list of untested API routes
 */
export function getUntestedRoutes(): string[] {
  const testFiles = discoverTestFiles()
  const testedRoutes = new Set<string>()

  for (const test of testFiles.filter(t => t.type === 'api')) {
    const feature = projectConfig.featureModules.find(f => f.id === test.featureModule)
    if (feature) {
      feature.apiRoutes.forEach(r => testedRoutes.add(r))
    }
  }

  const allRoutes = projectConfig.featureModules.flatMap(f => f.apiRoutes)
  return allRoutes.filter(r => !testedRoutes.has(r))
}

/**
 * Gets list of critical user journeys without E2E tests
 */
export function getUntestedJourneys(): CriticalUserJourney[] {
  const testFiles = discoverTestFiles()
  const e2eTests = testFiles.filter(t => t.type === 'e2e')

  if (e2eTests.length === 0) {
    return projectConfig.criticalUserJourneys
  }

  // Would need to match E2E tests to journeys - simplified here
  return projectConfig.criticalUserJourneys.filter(j =>
    j.priority === 'critical' || j.priority === 'high'
  )
}

/**
 * Validates that a test file follows naming conventions
 */
export function validateTestFileNaming(filePath: string): { valid: boolean; issues: string[] } {
  const issues: string[] = []

  if (!filePath.endsWith('.test.ts') && !filePath.endsWith('.spec.ts')) {
    issues.push('Test file should end with .test.ts or .spec.ts')
  }

  if (!filePath.includes('tests/')) {
    issues.push('Test file should be in tests/ directory')
  }

  const type = filePath.includes('/unit/') ? 'unit' :
    filePath.includes('/api/') ? 'api' :
      filePath.includes('/integration/') ? 'integration' :
        filePath.includes('/e2e/') ? 'e2e' : 'unknown'

  if (type === 'unknown') {
    issues.push('Test file should be in unit/, api/, integration/, or e2e/ subdirectory')
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

export default {
  discoverTestFiles,
  analyzeFeatureCoverage,
  auditMCPCapabilities,
  generateTestManifest,
  generateAnalysisReport,
  getUntestedRoutes,
  getUntestedJourneys,
  validateTestFileNaming,
}
