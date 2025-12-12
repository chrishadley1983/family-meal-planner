#!/usr/bin/env npx ts-node

/**
 * CLI Test Runner for Family Meal Planner
 *
 * Runs comprehensive regression tests with various modes and reporting.
 * Can be triggered by Claude Code for automated testing.
 *
 * Usage:
 *   npx ts-node scripts/run-tests.ts           # Run all tests
 *   npx ts-node scripts/run-tests.ts --unit    # Run only unit tests
 *   npx ts-node scripts/run-tests.ts --watch   # Watch mode
 *   npx ts-node scripts/run-tests.ts --coverage # With coverage
 */

import { spawn } from 'child_process'
import * as path from 'path'

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logHeader(title: string) {
  const border = '═'.repeat(60)
  log(`\n${border}`, colors.cyan)
  log(`  ${title}`, colors.bright + colors.cyan)
  log(`${border}\n`, colors.cyan)
}

function logResult(label: string, passed: boolean) {
  const icon = passed ? '✅' : '❌'
  const color = passed ? colors.green : colors.red
  log(`${icon} ${label}`, color)
}

interface TestOptions {
  unit: boolean
  integration: boolean
  coverage: boolean
  watch: boolean
  verbose: boolean
  updateSnapshots: boolean
  filter?: string
}

function parseArgs(): TestOptions {
  const args = process.argv.slice(2)
  return {
    unit: args.includes('--unit') || args.includes('-u'),
    integration: args.includes('--integration') || args.includes('-i'),
    coverage: args.includes('--coverage') || args.includes('-c'),
    watch: args.includes('--watch') || args.includes('-w'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    updateSnapshots: args.includes('--update-snapshots') || args.includes('-U'),
    filter: args.find(a => a.startsWith('--filter='))?.split('=')[1],
  }
}

function buildJestArgs(options: TestOptions): string[] {
  const args: string[] = []

  // Test selection
  if (options.unit && !options.integration) {
    args.push('--selectProjects', 'unit')
  } else if (options.integration && !options.unit) {
    args.push('--selectProjects', 'integration')
  }

  // Coverage
  if (options.coverage) {
    args.push('--coverage')
  }

  // Watch mode
  if (options.watch) {
    args.push('--watch')
  }

  // Verbose output
  if (options.verbose) {
    args.push('--verbose')
  }

  // Update snapshots
  if (options.updateSnapshots) {
    args.push('--updateSnapshot')
  }

  // Filter specific tests
  if (options.filter) {
    args.push('--testNamePattern', options.filter)
  }

  // Always use colors
  args.push('--colors')

  // Force exit after tests complete
  args.push('--forceExit')

  return args
}

async function runJest(args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const jest = spawn('npx', ['jest', ...args], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
    })

    jest.on('close', (code) => {
      resolve(code === 0)
    })

    jest.on('error', (err) => {
      log(`Failed to start Jest: ${err.message}`, colors.red)
      resolve(false)
    })
  })
}

async function checkPrerequisites(): Promise<boolean> {
  log('Checking prerequisites...', colors.yellow)

  // Check if jest is installed
  try {
    const { execSync } = await import('child_process')
    execSync('npx jest --version', { stdio: 'pipe' })
    logResult('Jest installed', true)
    return true
  } catch {
    logResult('Jest not installed', false)
    log('\nPlease install test dependencies:', colors.yellow)
    log('  npm install --save-dev jest ts-jest @types/jest jest-junit', colors.cyan)
    return false
  }
}

async function main() {
  const startTime = Date.now()
  const options = parseArgs()

  logHeader('🧪 Family Meal Planner Regression Tests')

  // Show usage if help requested
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    log('Usage: npx ts-node scripts/run-tests.ts [options]\n')
    log('Options:')
    log('  --unit, -u           Run only unit tests')
    log('  --integration, -i    Run only integration tests')
    log('  --coverage, -c       Generate coverage report')
    log('  --watch, -w          Watch mode for development')
    log('  --verbose, -v        Verbose output')
    log('  --update-snapshots   Update test snapshots')
    log('  --filter=<pattern>   Run tests matching pattern')
    log('  --help, -h           Show this help message')
    return
  }

  // Check prerequisites
  const prereqsOk = await checkPrerequisites()
  if (!prereqsOk) {
    process.exit(1)
  }

  // Build Jest arguments
  const jestArgs = buildJestArgs(options)

  // Log what we're running
  log('\nRunning tests with options:', colors.blue)
  if (options.unit) log('  • Unit tests only', colors.cyan)
  if (options.integration) log('  • Integration tests only', colors.cyan)
  if (options.coverage) log('  • Coverage enabled', colors.cyan)
  if (options.watch) log('  • Watch mode', colors.cyan)
  if (options.filter) log(`  • Filter: ${options.filter}`, colors.cyan)

  log('\n')

  // Run Jest
  const success = await runJest(jestArgs)

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2)

  logHeader('📊 Test Summary')
  logResult('All tests', success)
  log(`\nDuration: ${duration}s`, colors.blue)

  if (options.coverage) {
    log('\n📈 Coverage report generated in ./coverage/', colors.green)
    log('   Open coverage/lcov-report/index.html to view', colors.cyan)
  }

  // Exit with appropriate code
  process.exit(success ? 0 : 1)
}

// Run the script
main().catch((err) => {
  log(`\n❌ Test runner error: ${err.message}`, colors.red)
  process.exit(1)
})
