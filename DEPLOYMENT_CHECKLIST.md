# Vercel Deployment Checklist

Use this checklist to ensure a smooth deployment to Vercel.

## Pre-Deployment

- [ ] **Database Migration**
  - [ ] Set up PostgreSQL database (Vercel Postgres, Neon, or Supabase)
  - [ ] Update `prisma/schema.prisma` to use PostgreSQL
  - [ ] Run `npx prisma generate`
  - [ ] Run `npx prisma migrate dev` to create migration
  - [ ] Test database connection locally

- [ ] **Storage Configuration**
  - [ ] Choose storage method: `s3`, `cloudinary`, or `shopify`
  - [ ] Set up cloud storage account (if using S3 or Cloudinary)
  - [ ] Get storage credentials
  - [ ] **IMPORTANT**: Ensure `STORAGE_METHOD` is NOT set to `local`

- [ ] **Environment Variables**
  - [ ] `SHOPIFY_API_KEY` - Your Shopify app API key
  - [ ] `SHOPIFY_API_SECRET` - Your Shopify app API secret
  - [ ] `SHOPIFY_APP_URL` - Will be your Vercel URL (e.g., `https://your-app.vercel.app`)
  - [ ] `SCOPES` - Your app scopes (e.g., `read_orders,write_products`)
  - [ ] `DATABASE_URL` - PostgreSQL connection string
  - [ ] `STORAGE_METHOD` - `s3`, `cloudinary`, or `shopify`
  - [ ] Storage-specific variables (if using S3 or Cloudinary)

- [ ] **Code Preparation**
  - [ ] Commit all changes to Git
  - [ ] Push to GitHub/GitLab/Bitbucket
  - [ ] Test build locally: `npm run build`
  - [ ] Verify build output exists in `build/` directory

## Deployment

- [ ] **Vercel Setup**
  - [ ] Create Vercel account (if needed)
  - [ ] Install Vercel CLI: `npm i -g vercel`
  - [ ] Login: `vercel login`
  - [ ] Link project: `vercel link`

- [ ] **Environment Variables in Vercel**
  - [ ] Add all required environment variables in Vercel dashboard
  - [ ] Set `SHOPIFY_APP_URL` to your Vercel URL (after first deployment)
  - [ ] Verify all variables are set correctly

- [ ] **Deploy**
  - [ ] Run: `vercel --prod`
  - [ ] Wait for build to complete
  - [ ] Copy the deployment URL

- [ ] **Update Shopify Configuration**
  - [ ] Update `shopify.app.thank-pdf-link.toml` with Vercel URL
  - [ ] Update `application_url` in config file
  - [ ] Update `redirect_urls` in config file
  - [ ] Run: `shopify app deploy` to update webhooks

- [ ] **Database Migration on Production**
  - [ ] Set `DATABASE_URL` to production database
  - [ ] Run: `npx prisma migrate deploy`
  - [ ] Verify tables are created

## Post-Deployment

- [ ] **Testing**
  - [ ] Visit your Vercel app URL
  - [ ] Test app installation in Shopify
  - [ ] Create a test order
  - [ ] Verify webhook is received
  - [ ] Verify PDF is generated
  - [ ] Verify PDF is stored in cloud storage
  - [ ] Test checkout extension on Thank You page
  - [ ] Verify PDF download works

- [ ] **Monitoring**
  - [ ] Check Vercel function logs
  - [ ] Check database connection
  - [ ] Monitor webhook deliveries in Shopify
  - [ ] Check storage for uploaded PDFs

- [ ] **Final Steps**
  - [ ] Update any documentation with production URL
  - [ ] Set up custom domain (optional)
  - [ ] Configure monitoring/alerts (optional)
  - [ ] Set up CI/CD for automatic deployments (optional)

## Troubleshooting

If something doesn't work:

1. **Check Vercel Logs**
   ```bash
   vercel logs
   ```

2. **Check Build Logs**
   - Go to Vercel dashboard → Your project → Deployments → Click on deployment → View build logs

3. **Verify Environment Variables**
   - Go to Vercel dashboard → Your project → Settings → Environment Variables
   - Ensure all variables are set

4. **Test Database Connection**
   ```bash
   vercel env pull .env.production
   npx prisma db pull
   ```

5. **Check Webhook Status**
   - Go to Shopify Partner Dashboard → Your app → Webhooks
   - Verify webhook URLs are correct
   - Check webhook delivery logs

## Common Issues

- **Build fails**: Check Node.js version (should be >=20.19 <22 || >=22.12)
- **Database connection fails**: Verify `DATABASE_URL` is correct and database allows Vercel IPs
- **PDF storage fails**: Ensure `STORAGE_METHOD` is not `local` and credentials are correct
- **Webhooks not working**: Verify `SHOPIFY_APP_URL` matches your Vercel URL
- **Function timeout**: Optimize PDF generation or increase timeout in `vercel.json`

