# Deploying CRM App to Cloudflare Pages

## Prerequisites
- GitHub account with this repository pushed
- Cloudflare account
- PostgreSQL database accessible from the internet (e.g., Neon, Supabase, or Railway)

## Step 1: Prepare the Database

Your PostgreSQL database must be accessible from Cloudflare's servers. Options:

### Option A: Use Neon (Recommended - Serverless PostgreSQL)
1. Sign up at https://neon.tech
2. Create a new project
3. Copy the connection string (looks like: `postgresql://user:pass@host.neon.tech/dbname?sslmode=require`)
4. Import your data from the local database

### Option B: Use Supabase
1. Sign up at https://supabase.com
2. Create a new project
3. Get the connection string from Project Settings > Database
4. Import your data

### Option C: Use Railway
1. Sign up at https://railway.app
2. Deploy a PostgreSQL database
3. Get the connection string
4. Import your data

## Step 2: Push to GitHub

```bash
# If not already done
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Step 3: Deploy to Cloudflare Pages

1. Go to https://dash.cloudflare.com
2. Select "Workers & Pages" from the sidebar
3. Click "Create application" > "Pages" > "Connect to Git"
4. Select your repository
5. Configure build settings:
   - **Framework preset**: Next.js
   - **Build command**: `cd crm-app && npm install && npm run build`
   - **Build output directory**: `crm-app/.next`
   - **Root directory**: `/` (leave as root)
   - **Node version**: 20.x

## Step 4: Configure Environment Variables

In Cloudflare Pages settings, add these environment variables:

### Required Variables:
- `DATABASE_URL`: Your PostgreSQL connection string
  - Example: `postgresql://user:password@host.neon.tech:5432/dbname?sslmode=require`
  - Make sure it includes `?sslmode=require` or `?sslmode=verify-full`

### Optional (if using different database in production):
- `NODE_ENV`: `production`

## Step 5: Run Database Migrations (if needed)

After deployment, if you need to run Prisma migrations on the production database:

```bash
# Set the production DATABASE_URL locally
export DATABASE_URL="your-production-database-url"

# Run migrations
cd crm-app
npx prisma migrate deploy

# Or push the schema directly
npx prisma db push
```

## Step 6: Verify Deployment

Once deployed, test these features:
- ✅ Agencies table loads with pagination
- ✅ Filters work (search, status, location, sources)
- ✅ Click on agency row opens detail dialog
- ✅ Source tabs display correctly
- ✅ Contact status can be updated
- ✅ Notes can be added and saved
- ✅ All data persists correctly

## Build Configuration for Cloudflare Pages

The app is already configured to work with Cloudflare Pages. The build settings are:

```json
{
  "build": {
    "command": "npm run build",
    "outputDirectory": ".next"
  }
}
```

## Troubleshooting

### Database Connection Issues
- Ensure your DATABASE_URL is correct and accessible from Cloudflare IPs
- Verify SSL mode is set correctly (`sslmode=require` or `sslmode=verify-full`)
- Check that your database allows connections from Cloudflare's IP ranges

### Build Failures
- Check build logs in Cloudflare Pages dashboard
- Verify all dependencies are in package.json (not just devDependencies)
- Ensure Prisma client is generated during build

### Runtime Errors
- Check Cloudflare Pages Functions logs
- Verify environment variables are set correctly
- Test database connection string locally first

## Alternative: Deploy to Vercel (Easier)

If you prefer a simpler deployment:

1. Go to https://vercel.com
2. Import your GitHub repository
3. Select `crm-app` as the root directory
4. Add `DATABASE_URL` environment variable
5. Deploy!

Vercel has better Next.js support since they created it.

## Post-Deployment Checklist

- [ ] Database connection working
- [ ] Environment variables configured
- [ ] Agencies table displays correctly
- [ ] Filters functional
- [ ] Detail dialog opens and shows data
- [ ] Contact status updates work
- [ ] Notes save successfully
- [ ] Performance is acceptable
- [ ] No console errors in production
