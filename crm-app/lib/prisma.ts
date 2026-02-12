/**
 * Prisma Client Instance for Next.js
 *
 * Uses Neon serverless driver (HTTP-based) per official Prisma docs
 * https://www.prisma.io/docs/orm/overview/databases/neon
 */

import { PrismaClient } from '../generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

// Declare global type for Prisma client
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Lazy initialization function
function getPrismaClient() {
  if (global.prisma) {
    return global.prisma
  }

  // Create Neon adapter with connection string (per Prisma docs)
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL
  })

  // Create Prisma client with adapter
  const client = new PrismaClient({ adapter })

  // Cache for hot reload
  if (process.env.NODE_ENV !== 'production') {
    global.prisma = client
  }

  return client
}

// Export with Proxy for lazy initialization
export const prisma = new Proxy({} as PrismaClient, {
  get: (_target, prop) => {
    const client = getPrismaClient()
    return (client as any)[prop]
  }
})
