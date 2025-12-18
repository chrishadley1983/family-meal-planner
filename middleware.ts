import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Security Headers Middleware
 *
 * Adds security headers to all responses and handles authentication
 * for protected routes.
 */

// Security headers applied to all responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

// Content Security Policy for production
const cspHeader = process.env.NODE_ENV === 'production'
  ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.anthropic.com wss://*.supabase.co; frame-ancestors 'none';"
  : undefined;

// Add security headers to response
function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  if (cspHeader) {
    response.headers.set('Content-Security-Policy', cspHeader)
  }

  return response
}

// Middleware for API routes - handle CORS
function handleApiRequest(request: NextRequest): NextResponse {
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 200 })
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
    return addSecurityHeaders(response)
  }

  const response = NextResponse.next()
  response.headers.set('Access-Control-Allow-Origin', '*')
  return addSecurityHeaders(response)
}

// Main middleware function
export default withAuth(
  function middleware(request) {
    // Handle API routes with CORS
    if (request.nextUrl.pathname.startsWith('/api/')) {
      // Skip auth check for health endpoint
      if (request.nextUrl.pathname === '/api/health') {
        return handleApiRequest(request)
      }
      // Other API routes go through auth + CORS
      return handleApiRequest(request)
    }

    // For protected pages, just add security headers
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  },
  {
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    // Protected pages (require auth)
    '/dashboard/:path*',
    '/profiles/:path*',
    '/recipes/:path*',
    '/meal-plans/:path*',
    '/shopping-lists/:path*',
    '/inventory/:path*',
    '/staples/:path*',
    '/nutritionist/:path*',
    '/products/:path*',
    '/settings/:path*',
    // API routes (for CORS and security headers)
    '/api/:path*',
  ]
}
