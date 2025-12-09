import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: connectionString
    }
  },
  log: ['query', 'error', 'warn'],
})

// Also export as default for compatibility with cached imports
export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
