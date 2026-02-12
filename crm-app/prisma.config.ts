import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  // Use schema from database folder
  schema: '../database/prisma/schema.prisma',

  // Don't need migrations in the app
  migrations: {
    path: '../database/prisma/migrations',
  },

  datasource: {
    url: env('DATABASE_URL'),
  },
})
