# Deploying to Cloudflare Workers with OpenNext

This guide walks through deploying your Next.js 16 CRM app to Cloudflare Workers using the OpenNext adapter.

## ⚠️ Important Compatibility Notes

### Current Setup Challenges

Your app currently uses:
- `@prisma/adapter-pg` with the `pg` (node-postgres) driver
- Traditional PostgreSQL with connection pooling

**This setup requires modifications for Cloudflare Workers:**

1. **Connection Pooling Issue**: The global `Pool` instance won't work on Cloudflare Workers
2. **Per-Request Client**: Need to create Prisma Client per request (Workers isolation model)
3. **Bundle Size**: Ensure Prisma + dependencies < 10 MiB

## Prerequisites

- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)
- PostgreSQL database with external access

## Recommended Database Options for Cloudflare

### Option 1: Neon Serverless (Recommended)
- Serverless PostgreSQL with HTTP/WebSocket connections
- Works perfectly with Cloudflare Workers
- Auto-scaling and connection pooling built-in

**Setup:**
1. Sign up at https://neon.tech
2. Create a project
3. Use the connection string (includes `?sslmode=require`)

### Option 2: Use Cloudflare Hyperdrive
- Adds connection pooling for traditional PostgreSQL
- Requires paid Cloudflare Workers plan
- More complex setup

### Option 3: Prisma Accelerate
- Adds edge caching and connection pooling
- Requires Prisma Data Platform subscription
- Works with any PostgreSQL

## Step 1: Install Dependencies

Already done! You have:
```json
"@opennextjs/cloudflare": "^1.16.4"
"wrangler": "^4.64.0"
```

## Step 2: Configuration Files

### `wrangler.toml` (Already created)
- Sets `nodejs_compat` flag for Node.js features
- Configures observability
- Define bindings and secrets here

### `open-next.config.ts` (Already created)
- Configures OpenNext to use Cloudflare Node.js wrapper

## Step 3: Build for Cloudflare

Run the build command:
```bash
npm run pages:build
```

This will:
1. Generate Prisma Client
2. Build Next.js app
3. Run OpenNext adapter to create Cloudflare-compatible output

Output will be in `.worker-next/` directory.

## Step 4: Set Environment Variables

### Set Database URL as a Secret
```bash
npx wrangler secret put DATABASE_URL
# Paste your DATABASE_URL when prompted
```

**Important**: Use a connection string compatible with Workers:
- Neon: `postgresql://user:pass@host.neon.tech/db?sslmode=require`
- With Hyperdrive: Configure Hyperdrive binding instead

### Set Other Variables
Add to `wrangler.toml` under `[vars]`:
```toml
[vars]
NODE_ENV = "production"
```

## Step 5: Deploy to Cloudflare

```bash
npm run pages:deploy
```

Or deploy directly:
```bash
npx wrangler deploy
```

This will:
1. Build the app for Cloudflare
2. Upload to Cloudflare Workers
3. Return your deployment URL (e.g., `https://agency-crm.your-account.workers.dev`)

## Step 6: Test Deployment

Visit your Workers URL and test:
- ✅ Homepage loads
- ✅ Agencies table displays
- ✅ Filters work
- ✅ Click on row opens detail dialog
- ✅ Contact status updates
- ✅ Notes save correctly

## Prisma Compatibility Fix (Required)

### Current Issue
Your `lib/prisma.ts` uses a global connection pool which doesn't work on Workers.

### Solution Options:

#### Option A: Simple Prisma Client (Quick Fix)
Replace the pool-based approach with a simpler client:

```typescript
// lib/prisma.ts
import { PrismaClient } from '../generated/prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
```

**Note**: This removes the pg adapter connection pooling. Make sure your DATABASE_URL supports direct connections.

#### Option B: Use Neon Serverless Driver
Install Neon's driver which works on Cloudflare:

```bash
npm install @neondatabase/serverless
npm install @prisma/adapter-neon
```

Update `lib/prisma.ts`:
```typescript
import { PrismaClient } from '../generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool } from '@neondatabase/serverless'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaNeon(pool)

export const prisma = new PrismaClient({ adapter })
```

#### Option C: Use Cloudflare Hyperdrive
Configure Hyperdrive for connection pooling:

1. Create Hyperdrive config in Cloudflare dashboard
2. Add binding to `wrangler.toml`:
```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "your-hyperdrive-id"
```

3. Update Prisma to use Hyperdrive connection string

## Troubleshooting

### Build Fails
- Check Node.js version (needs 20.x)
- Ensure Prisma schema is valid
- Check bundle size: `npx wrangler deploy --dry-run`

### Database Connection Errors
- Verify DATABASE_URL secret is set correctly
- Ensure database allows Cloudflare IPs
- Check SSL mode in connection string
- Test connection locally first

### Runtime Errors
- Check Workers logs: `npx wrangler tail`
- Verify all dependencies are compatible with Workers
- Check for unsupported Node.js APIs

### Bundle Size Too Large
- Use `npx wrangler deploy --dry-run` to check size
- Workers limit: 10 MiB (paid plan) or 3 MiB (free)
- Consider removing unused dependencies
- Use external packages feature for large dependencies

## Local Development with Wrangler

Test locally before deploying:
```bash
npm run pages:dev
```

This starts Wrangler dev server with hot reload.

## Deployment Checklist

- [ ] Database accessible from Cloudflare IPs
- [ ] DATABASE_URL secret set with `wrangler secret put`
- [ ] Prisma client compatible with Workers (no global pool)
- [ ] Build succeeds: `npm run pages:build`
- [ ] Local test works: `npm run pages:dev`
- [ ] Deploy: `npm run pages:deploy`
- [ ] Test all features on deployed URL
- [ ] Check Workers logs for errors

## Monitoring

### View Logs
```bash
npx wrangler tail
```

### View Metrics
Go to Cloudflare Dashboard > Workers & Pages > your-worker > Metrics

## Updating Deployment

After making changes:
```bash
npm run pages:deploy
```

This rebuilds and redeploys automatically.

## Cost Considerations

**Cloudflare Workers Free Tier:**
- 100,000 requests/day
- 10ms CPU time per request
- May be sufficient for small CRMs

**Paid Plan ($5/month):**
- 10 million requests/month
- 50ms CPU time per request
- 10 MiB bundle size limit
- Required for Hyperdrive

## Next Steps

1. **Fix Prisma Setup**: Choose Option A, B, or C above
2. **Test Build**: Run `npm run pages:build`
3. **Set Secrets**: `npx wrangler secret put DATABASE_URL`
4. **Deploy**: `npm run pages:deploy`
5. **Verify**: Test all features on deployed URL

## Need Help?

- OpenNext Docs: https://opennext.js.org/cloudflare
- Cloudflare Discord: https://discord.gg/cloudflaredev
- Wrangler Issues: https://github.com/cloudflare/workers-sdk/issues
