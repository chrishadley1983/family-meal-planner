import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Health Check Endpoint
 * Used by:
 * - Vercel for deployment verification
 * - Load balancers for health checks
 * - Uptime monitoring services
 * - CI/CD pipelines for deployment validation
 */

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    database: {
      status: 'ok' | 'error';
      latency?: number;
      error?: string;
    };
    memory: {
      status: 'ok' | 'warning';
      usedMB: number;
      totalMB: number;
      percentUsed: number;
    };
  };
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const startTime = Date.now();
  const checks: HealthStatus['checks'] = {
    database: { status: 'ok' },
    memory: { status: 'ok', usedMB: 0, totalMB: 0, percentUsed: 0 },
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'ok',
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }

  // Check memory usage (if available in Node.js environment)
  try {
    const memUsage = process.memoryUsage();
    const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const percentUsed = Math.round((usedMB / totalMB) * 100);

    checks.memory = {
      status: percentUsed > 90 ? 'warning' : 'ok',
      usedMB,
      totalMB,
      percentUsed,
    };
  } catch {
    // Memory check not critical, ignore errors
  }

  // Determine overall status
  let status: HealthStatus['status'] = 'healthy';
  if (checks.database.status === 'error') {
    status = 'unhealthy';
  } else if (checks.memory.status === 'warning') {
    status = 'degraded';
  }

  const response: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    checks,
  };

  // Return appropriate HTTP status
  const httpStatus = status === 'unhealthy' ? 503 : 200;

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Response-Time': `${Date.now() - startTime}ms`,
    },
  });
}
