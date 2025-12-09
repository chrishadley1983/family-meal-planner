import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma 7.x uses DATABASE_URL from environment automatically
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

// Also export as default for compatibility with cached imports
export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
