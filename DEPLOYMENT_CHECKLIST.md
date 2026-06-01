# 🚀 Railway Deployment Checklist

## Before Pushing to Git

### ✅ 1. Get Your Shopify API Secret
1. Go to [Shopify Partner Dashboard](https://partners.shopify.com/)
2. Navigate to Apps → Your App
3. Copy the **API secret key**
4. Update `.env` file (line 67):
   ```
   SHOPIFY_API_SECRET=your_actual_secret_here
   ```

### ✅ 2. Verify Local .env File
Ensure these critical values are set in your `.env`:
- [x] APP_KEY is generated (already done: `base64:2bKVTtkbv9QvQ1Fxj1jcVEdq3Wcwb1rBHIMrDwNfA2Y=`)
- [ ] SHOPIFY_API_SECRET is filled (REPLACE THIS!)
- [x] APP_URL points to your Railway domain
- [x] DB_CONNECTION=pgsql
- [x] SESSION_SECURE_COOKIE=true
- [x] SESSION_SAME_SITE=none

### ✅ 3. Test Locally (Optional but Recommended)
```bash
# Install dependencies
composer install
npm install

# Build assets
npm run build

# Test the app
php artisan serve
```

### ✅ 4. Commit and Push All Changes
```bash
# Stage all new files
git add Procfile nixpacks.toml start.sh .railwayignore RAILWAY_DEPLOYMENT.md DEPLOYMENT_CHECKLIST.md composer.json

# Commit
git commit -m "Add Railway deployment configuration"

# Push to master branch
git push origin master
```

## Railway Platform Setup

### ✅ 5. Create Railway Project
1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Select repository: `wajahatnaqvee/Shopify-Webhook-Monitoring`
4. Choose branch: **master**

### ✅ 6. Add PostgreSQL Database
1. In Railway project dashboard, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Wait for provisioning (auto-creates `DATABASE_URL`)

### ✅ 7. Configure Environment Variables
Click on your web service → **Variables** tab → **RAW Editor**

Paste this (update the values in CAPS):
```bash
APP_NAME="Webhook Monitor"
APP_ENV=production
APP_KEY=base64:2bKVTtkbv9QvQ1Fxj1jcVEdq3Wcwb1rBHIMrDwNfA2Y=
APP_DEBUG=false
APP_URL=REPLACE_WITH_RAILWAY_DOMAIN

DB_CONNECTION=pgsql
DB_URL=${DATABASE_URL}

LOG_CHANNEL=stack
LOG_LEVEL=info

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=none

QUEUE_CONNECTION=database
CACHE_STORE=database

SHOPIFY_APP_NAME="Webhook Monitor"
SHOPIFY_API_KEY=d24b5843b7042c620107939e3dee6b12
SHOPIFY_API_SECRET=REPLACE_WITH_YOUR_SHOPIFY_SECRET
SHOPIFY_API_VERSION=2026-01
SHOPIFY_API_SCOPES="read_customers,write_customers,read_fulfillments,write_fulfillments,read_inventory,read_metaobject_definitions,read_metaobjects,read_online_store_pages,write_online_store_pages,read_orders,write_orders,read_products,write_products,read_script_tags,write_script_tags,read_content,write_content,read_themes,write_themes"
SHOPIFY_API_GRANT_MODE=OFFLINE
SHOPIFY_EXPIRING_OFFLINE_TOKENS=true
APP_UNINSTALLED_CALLBACK_URL=${APP_URL}/webhook/app-uninstalled
```

### ✅ 8. Generate Railway Domain
1. Click on service → **Settings** tab
2. Under **Networking** section
3. Click **"Generate Domain"**
4. Copy the generated domain (e.g., `yourapp-production.up.railway.app`)

### ✅ 9. Update APP_URL Variable
1. Go back to **Variables** tab
2. Find `APP_URL` variable
3. Update it to: `https://yourapp-production.up.railway.app` (your actual domain)
4. Save changes

### ✅ 10. Configure Service Settings
Click **Settings** tab and verify:
- **Root Directory**: `.` (or leave empty)
- **Build Command**: (empty - nixpacks handles it)
- **Start Command**: (empty - nixpacks handles it)

### ✅ 11. Deploy
1. Go to **Deployments** tab
2. Railway automatically deploys on git push
3. Wait for build to complete (5-10 minutes first time)
4. Watch logs for errors

## After First Deployment

### ✅ 12. Verify Deployment
Check these URLs (replace with your domain):
- https://yourapp.up.railway.app (should show Shopify install screen)
- https://yourapp.up.railway.app/up (health check - should return "OK")

### ✅ 13. Update Shopify App Configuration

#### In Shopify Partner Dashboard:
1. Apps → Your App → Configuration
2. Update **App URL**: `https://yourapp.up.railway.app`
3. Update **Allowed redirection URL(s)**: `https://yourapp.up.railway.app/authenticate`
4. Save changes

#### In your local shopify.app.toml:
```toml
application_url = "https://yourapp.up.railway.app"

[auth]
redirect_urls = [ "https://yourapp.up.railway.app/authenticate" ]
```

Commit and push:
```bash
git add shopify.app.toml
git commit -m "Update Shopify app URLs for Railway deployment"
git push origin master
```

### ✅ 14. Test Installation
1. From Shopify Partner dashboard, click **"Test on development store"**
2. Select a test store
3. Install the app
4. Verify webhook registration works
5. Test webhook event monitoring

## Ongoing Maintenance

### When You Make Code Changes
```bash
# Make your changes
git add .
git commit -m "Description of changes"
git push origin master

# Railway auto-deploys on push to master
```

### View Logs
Railway Dashboard → Your Service → Deployments → Click latest → View Logs

### Run Commands on Railway
Railway Dashboard → Your Service → Click **"⋮"** → **"Shell"**

Useful commands:
```bash
# Run migrations
php artisan migrate --force

# Clear cache
php artisan cache:clear
php artisan config:clear

# Check database connection
php artisan db:show
```

## Common Issues & Solutions

### ❌ Issue: Build fails with "README.md" error
**Solution**: Ensure you're deploying from `master` branch, not `main`
- Railway Settings → Deploy Branch → Change to `master`

### ❌ Issue: Database connection failed
**Solution**: 
- Verify PostgreSQL service is running in Railway
- Check `DATABASE_URL` exists in Variables
- Ensure `DB_CONNECTION=pgsql`

### ❌ Issue: Session/Cookie errors in Shopify
**Solution**:
- Set `SESSION_SECURE_COOKIE=true`
- Set `SESSION_SAME_SITE=none`
- Verify APP_URL uses `https://`

### ❌ Issue: Webhooks not being delivered
**Solution**:
- Verify APP_URL is correct and accessible
- Check Shopify Partner dashboard webhook settings
- Review Railway logs for incoming requests

## Security Reminders

- ✅ Never commit `.env` to git (already in .gitignore)
- ✅ Keep SHOPIFY_API_SECRET secure
- ✅ Use Railway's secret variables for sensitive data
- ✅ Regularly rotate APP_KEY if compromised
- ✅ Enable 2FA on Railway account
- ✅ Monitor Railway access logs

## Cost Monitoring

Railway Free Tier Limits:
- 500 hours/month
- $5 credit/month
- Shared resources

For production apps, consider upgrading to Railway Pro for:
- Better performance
- More resources
- Priority support
