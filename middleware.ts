import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profiles/:path*',
    '/recipes/:path*',
    '/meal-plans/:path*',
    '/shopping-lists/:path*',
    '/inventory/:path*',
    '/staples/:path*',
  ]
}
