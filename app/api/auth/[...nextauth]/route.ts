import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

// Export authOptions for other routes to use
export { authOptions }
export { handler as GET, handler as POST }
