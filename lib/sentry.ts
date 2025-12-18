/**
 * Sentry Error Tracking Configuration
 *
 * This module provides error tracking and performance monitoring
 * for the Family Fuel application.
 *
 * Setup steps:
 * 1. Create a Sentry account at https://sentry.io
 * 2. Create a Next.js project
 * 3. Copy the DSN to your environment variables
 * 4. Set SENTRY_DSN in Vercel environment variables
 */

// Note: Full Sentry SDK integration requires @sentry/nextjs package
// For now, we provide a lightweight error reporting solution

interface ErrorReport {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  level: 'error' | 'warning' | 'info';
  timestamp: string;
  environment: string;
  url?: string;
  userId?: string;
}

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || 'development';

/**
 * Report an error to Sentry (or console in development)
 */
export async function reportError(
  error: Error | string,
  context?: Record<string, unknown>,
  level: 'error' | 'warning' | 'info' = 'error'
): Promise<void> {
  const errorReport: ErrorReport = {
    message: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    context,
    level,
    timestamp: new Date().toISOString(),
    environment: ENVIRONMENT,
  };

  // In development, log to console
  if (ENVIRONMENT === 'development' || !SENTRY_DSN) {
    console.error('[Error Report]', errorReport);
    return;
  }

  // In production with Sentry configured, send to Sentry
  try {
    // Sentry envelope format for error events
    const event = {
      exception: {
        values: [
          {
            type: error instanceof Error ? error.constructor.name : 'Error',
            value: errorReport.message,
            stacktrace: errorReport.stack
              ? {
                  frames: parseStackTrace(errorReport.stack),
                }
              : undefined,
          },
        ],
      },
      level,
      timestamp: Date.now() / 1000,
      environment: ENVIRONMENT,
      extra: context,
    };

    // Send to Sentry via their envelope endpoint
    // This is a simplified implementation - for full features, use @sentry/nextjs
    await fetch(SENTRY_DSN.replace('//', '//o').replace('@', '.ingest.') + '/api/store/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
  } catch (reportingError) {
    // Don't let error reporting crash the app
    console.error('[Sentry] Failed to report error:', reportingError);
  }
}

/**
 * Parse a stack trace string into Sentry frame format
 */
function parseStackTrace(stack: string): Array<{ filename: string; lineno: number; function: string }> {
  const lines = stack.split('\n').slice(1); // Skip the error message line
  return lines
    .map((line) => {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):\d+\)/);
      if (match) {
        return {
          function: match[1],
          filename: match[2],
          lineno: parseInt(match[3], 10),
        };
      }
      return null;
    })
    .filter((frame): frame is { filename: string; lineno: number; function: string } => frame !== null);
}

/**
 * Capture a message (non-error) to Sentry
 */
export function captureMessage(message: string, context?: Record<string, unknown>): void {
  reportError(message, context, 'info');
}

/**
 * Set user context for error reports
 */
export function setUser(user: { id: string; email?: string }): void {
  // Store in a way that can be accessed by reportError
  if (typeof globalThis !== 'undefined') {
    (globalThis as Record<string, unknown>).__sentryUser = user;
  }
}

/**
 * Clear user context
 */
export function clearUser(): void {
  if (typeof globalThis !== 'undefined') {
    delete (globalThis as Record<string, unknown>).__sentryUser;
  }
}
