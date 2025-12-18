/**
 * E2E Test Type Definitions
 *
 * Defines types for structured E2E test specifications
 */

export interface E2ETestAssertion {
  type: string
  target: string
  expected?: string | number | boolean
}

export interface E2ETestStep {
  action: string
  description?: string
  target?: string
  value?: string
  params?: Record<string, any>
  assertions?: E2ETestAssertion[]
  screenshot?: boolean
  waitFor?: string | number
  waitAfter?: number
}

export interface E2ECleanupStep {
  action: string
  params: Record<string, any>
}

export interface E2ETestSpec {
  id: string
  name: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  requiresAuth: boolean
  timeout?: number
  preconditions?: string[]
  steps: E2ETestStep[]
  cleanup?: E2ECleanupStep[]
  expectedOutcome?: string
  tags?: string[]
}
