/**
 * Prisma Client Instance for Next.js
 *
 * Uses Neon serverless driver for Cloudflare Workers compatibility
 * Implements singleton pattern for serverless environments
 */

import { PrismaClient } from '../generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool } from '@neondatabase/serverless'

// Declare global type for Prisma client
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Create Neon serverless connection pool
const connectionString = process.env.DATABASE_URL!
const pool = new Pool({ connectionString })

// Create Prisma adapter for Neon
const adapter = new PrismaNeon(pool as any) // Type assertion for compatibility

// Singleton Prisma client
export const prisma = global.prisma || new PrismaClient({ adapter })

// Prevent multiple instances in development (hot reload)
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}
