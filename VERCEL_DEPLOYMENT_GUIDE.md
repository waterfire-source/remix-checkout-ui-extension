# Vercel Deployment Guide for Shopify React Router App

This guide will walk you through deploying your Shopify app to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub/GitLab/Bitbucket Account**: Your code should be in a Git repository
3. **PostgreSQL Database**: Vercel doesn't support SQLite. You'll need a PostgreSQL database (recommended: [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), [Neon](https://neon.tech), or [Supabase](https://supabase.com))
4. **Cloud Storage**: Since Vercel is serverless, you cannot use local file storage. Configure one of:
   - AWS S3
   - Cloudinary
   - Shopify Files API

## Step 1: Prepare Your Database

### Option A: Use Vercel Storage Integration (Recommended - Easiest)

**Using Neon (Recommended for Serverless):**

1. In your Vercel project dashboard, go to **Settings** → **Integrations**
2. Find **Neon** in the Storage section and click **Add Integration**
3. Follow the prompts to:
   - Create a new Neon account (if needed) or connect existing account
   - Create a new database or select an existing one
   - Link it to your Vercel project
4. Vercel will automatically:
   - Create the database
   - Set the `DATABASE_URL` environment variable
   - Configure connection pooling

**Using Supabase:**

1. In your Vercel project dashboard, go to **Settings** → **Integrations**
2. Find **Supabase** in the Storage section and click **Add Integration**
3. Follow the prompts to:
   - Create a new Supabase account (if needed) or connect existing account
   - Create a new project or select an existing one
   - Link it to your Vercel project
4. Vercel will automatically set the `DATABASE_URL` environment variable

**Note:** The "Prisma" option in Vercel integrations is **Prisma Accelerate** (connection pooling service), not a database. You still need a PostgreSQL database (Neon, Supabase, or Vercel Postgres).

### Option B: Use Vercel Postgres (Native Integration)

1. Go to your Vercel dashboard
2. Navigate to **Storage** tab (or find it in Integrations)
3. Create a new Postgres database
4. Copy the connection string (it will be in the format: `postgresql://...`)

### Option C: Use External PostgreSQL (Manual Setup)

1. Create a PostgreSQL database on your preferred provider (Neon, Supabase, etc.)
2. Copy the connection string
3. Manually add `DATABASE_URL` environment variable in Vercel project settings

### Update Prisma Schema

Update `prisma/schema.prisma` to use PostgreSQL:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Run Migration

```bash
# Generate Prisma client
npx prisma generate

# Create and run migration
npx prisma migrate dev --name migrate_to_postgresql
```

## Step 2: Configure Storage Method

Since Vercel is serverless, you **must** use cloud storage. Set the `STORAGE_METHOD` environment variable to one of:

- `s3` - AWS S3
- `cloudinary` - Cloudinary
- `shopify` - Shopify Files API

**Do NOT use `local` storage on Vercel** - it won't work in serverless functions.

### If Using AWS S3:

Set these environment variables:
- `STORAGE_METHOD=s3`
- `AWS_ACCESS_KEY_ID=your_access_key`
- `AWS_SECRET_ACCESS_KEY=your_secret_key`
- `AWS_S3_BUCKET_NAME=your_bucket_name`
- `AWS_S3_REGION=your_region`

### If Using Cloudinary:

Set these environment variables:
- `STORAGE_METHOD=cloudinary`
- `CLOUDINARY_CLOUD_NAME=your_cloud_name`
- `CLOUDINARY_API_KEY=your_api_key`
- `CLOUDINARY_API_SECRET=your_api_secret`

### If Using Shopify Files API:

Set this environment variable:
- `STORAGE_METHOD=shopify`

## Step 3: Update Shopify App Configuration

Update `shopify.app.thank-pdf-link.toml` with your Vercel URL:

```toml
application_url = "https://your-app.vercel.app"
```

And update redirect URLs:
```toml
[auth]
redirect_urls = [ "https://your-app.vercel.app/api/auth" ]
```

## Step 4: Set Up Environment Variables

You'll need to set these environment variables in Vercel:

### Required Shopify Variables:
- `SHOPIFY_API_KEY` - Your Shopify app API key
- `SHOPIFY_API_SECRET` - Your Shopify app API secret
- `SHOPIFY_APP_URL` - Your Vercel app URL (e.g., `https://your-app.vercel.app`)
- `SCOPES` - Your app scopes (e.g., `read_orders,write_products`)

### Required Database:
- `DATABASE_URL` - Your PostgreSQL connection string

### Storage (choose one):
- `STORAGE_METHOD` - `s3`, `cloudinary`, or `shopify`
- (If S3) `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME`, `AWS_S3_REGION`
- (If Cloudinary) `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### Optional:
- `SHOP_CUSTOM_DOMAIN` - If using custom shop domains

## Step 5: Deploy to Vercel

### Method 1: Using Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link your project**:
   ```bash
   vercel link
   ```
   Follow the prompts to link your project.

4. **Set environment variables**:
   ```bash
   vercel env add SHOPIFY_API_KEY
   vercel env add SHOPIFY_API_SECRET
   vercel env add SHOPIFY_APP_URL
   vercel env add DATABASE_URL
   vercel env add STORAGE_METHOD
   # Add other environment variables as needed
   ```

5. **Deploy**:
   ```bash
   vercel --prod
   ```

### Method 2: Using Vercel Dashboard

1. **Import your repository**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your Git repository
   - Vercel will auto-detect React Router

2. **Configure project**:
   - Framework Preset: Other
   - Build Command: `npm run build`
   - Output Directory: `build/client`
   - Install Command: `npm install`

3. **Add environment variables**:
   - Go to Project Settings → Environment Variables
   - Add all required variables (see Step 4)

4. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete

## Step 6: Update Webhook URLs in Shopify

After deployment, update your webhook URLs in Shopify:

1. Go to your Shopify Partner Dashboard
2. Navigate to your app
3. Update webhook URLs to use your Vercel URL:
   - `https://your-app.vercel.app/webhooks/orders/create`
   - `https://your-app.vercel.app/webhooks/app/uninstalled`
   - `https://your-app.vercel.app/webhooks/app/scopes_update`

Or use Shopify CLI:
```bash
shopify app deploy
```

## Step 7: Run Database Migrations

After deployment, run migrations on production:

```bash
# Set DATABASE_URL to production database
export DATABASE_URL="your_production_database_url"

# Run migrations
npx prisma migrate deploy
```

Or use Vercel's CLI:
```bash
vercel env pull .env.production
npx prisma migrate deploy
```

## Step 8: Test Your Deployment

1. **Test the app URL**: Visit `https://your-app.vercel.app`
2. **Test webhooks**: Create a test order in your Shopify store
3. **Test PDF generation**: Check if PDFs are generated and stored correctly
4. **Test checkout extension**: Complete a test checkout and verify PDF download

## Troubleshooting

### Issue: Database Connection Errors

- Ensure `DATABASE_URL` is set correctly
- Check if your database allows connections from Vercel's IPs
- For Vercel Postgres, connections are automatically allowed

### Issue: PDF Storage Not Working

- Ensure `STORAGE_METHOD` is set (not `local`)
- Verify cloud storage credentials are correct
- Check Vercel function logs for errors

### Issue: Webhooks Not Working

- Verify webhook URLs are updated in Shopify
- Check webhook subscriptions in Shopify Partner Dashboard
- Ensure `SHOPIFY_APP_URL` matches your Vercel URL

### Issue: Build Failures

- Check Node.js version (should be >=20.19 <22 || >=22.12)
- Ensure all dependencies are in `package.json`
- Check build logs in Vercel dashboard

### Issue: Function Timeout

- Large PDFs might timeout (default is 10s, max is 30s)
- Consider optimizing PDF generation
- Or use background jobs for large PDFs

## Important Notes

1. **File Storage**: Never use `local` storage on Vercel. Always use cloud storage.

2. **Database**: SQLite won't work on Vercel. Use PostgreSQL.

3. **Environment Variables**: Make sure all environment variables are set in Vercel dashboard.

4. **Build Output**: The build output should be in `build/client` and `build/server`.

5. **Function Limits**: Vercel has execution time limits. For long-running tasks, consider:
   - Using Vercel Cron Jobs
   - Using background job queues
   - Optimizing your code

6. **Cold Starts**: Serverless functions may have cold starts. First request might be slower.

## Next Steps

After successful deployment:

1. Set up a custom domain (optional)
2. Configure monitoring and logging
3. Set up CI/CD for automatic deployments
4. Configure preview deployments for testing

## Support

If you encounter issues:
- Check Vercel logs: `vercel logs`
- Check Vercel dashboard for build logs
- Review Shopify app logs
- Check database connection status

