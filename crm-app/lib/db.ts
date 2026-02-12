/**
 * Neon Serverless Database Client for Cloudflare Workers
 *
 * Uses HTTP-based Neon driver (no TCP/WebSockets needed)
 * Per official guide: https://neon.com/docs/guides/cloudflare-workers
 */

import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create Neon SQL client
export const sql = neon(process.env.DATABASE_URL);
