import { PrismaClient } from '@prisma/client'

// Evita múltiples instancias del cliente Prisma en desarrollo (hot reload de Next.js)
const PRISMA_SCHEMA_VERSION = '2026_09_12_food_court_commissions'
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaVersion: string | undefined
}

if (globalForPrisma.prisma && globalForPrisma.prismaVersion !== PRISMA_SCHEMA_VERSION) {
  try {
    globalForPrisma.prisma.$disconnect()
  } catch {}
  globalForPrisma.prisma = undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaVersion = PRISMA_SCHEMA_VERSION
}
