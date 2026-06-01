# Railway Deployment Guide for Shopify Webhook Monitor

## Prerequisites
1. Railway account (https://railway.app)
2. GitHub repository connected to Railway
3. Shopify Partner account with app credentials

## Required Environment Variables in Railway

Set these in Railway's service settings → Variables:

```bash
# Application
APP_NAME="Webhook Monitor"
APP_ENV=production
APP_KEY=base64:YOUR_APP_KEY_HERE
APP_DEBUG=false
APP_URL=https://your-railway-domain.railway.app

# Database (Railway provides this automatically)
DATABASE_URL=${DATABASE_URL}

# Database Connection
DB_CONNECTION=pgsql

# Logging
LOG_CHANNEL=stack
LOG_LEVEL=info

# Session (Critical for Shopify embedded apps)
SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=none

# Queue
QUEUE_CONNECTION=database

# Cache
CACHE_STORE=database

# Shopify Configuration
SHOPIFY_APP_NAME="Webhook Monitor"
SHOPIFY_API_KEY=d24b5843b7042c620107939e3dee6b12
SHOPIFY_API_SECRET=YOUR_SHOPIFY_API_SECRET
SHOPIFY_API_VERSION=2026-01
SHOPIFY_API_SCOPES="read_customers,write_customers,read_fulfillments,write_fulfillments,read_inventory,read_metaobject_definitions,read_metaobjects,read_online_store_pages,write_online_store_pages,read_orders,write_orders,read_products,write_products,read_script_tags,write_script_tags,read_content,write_content,read_themes,write_themes"
SHOPIFY_API_GRANT_MODE=OFFLINE
SHOPIFY_EXPIRING_OFFLINE_TOKENS=true

# Webhooks
APP_UNINSTALLED_CALLBACK_URL=${APP_URL}/webhook/app-uninstalled
```

## Railway Setup Steps

### 1. Create New Project in Railway
1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your repository: `wajahatnaqvee/Shopify-Webhook-Monitoring`
4. Choose the `master` branch

### 2. Add PostgreSQL Database
1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create `DATABASE_URL` variable

### 3. Configure Service Settings
1. Click on your web service
2. Go to "Settings" tab
3. Set these values:
   - **Root Directory**: `.` (leave empty or set to root)
   - **Build Command**: (leave empty, nixpacks.toml handles this)
   - **Start Command**: (leave empty, nixpacks.toml handles this)
   - **Watch Paths**: (leave empty)

### 4. Set Environment Variables
1. Go to "Variables" tab
2. Click "RAW Editor"
3. Paste the environment variables from above
4. Replace placeholders:
   - `YOUR_APP_KEY_HERE` with the value from your local .env
   - `YOUR_SHOPIFY_API_SECRET` with your Shopify app's API secret
   - `your-railway-domain.railway.app` with your actual Railway domain

### 5. Generate Domain
1. Go to "Settings" tab
2. Under "Domains", click "Generate Domain"
3. Copy the generated domain (e.g., `yourapp.up.railway.app`)
4. Update `APP_URL` variable with this domain (with https://)
5. Update `APP_UNINSTALLED_CALLBACK_URL` if needed

### 6. Deploy
1. Railway will automatically deploy after setup
2. Monitor deployment in "Deployments" tab
3. Check logs for any errors

### 7. Post-Deployment
After successful deployment:

1. **Update Shopify App Settings**:
   - Go to your Shopify Partner dashboard
   - Update App URL to: `https://your-railway-domain.railway.app`
   - Update Allowed redirection URL(s) to: `https://your-railway-domain.railway.app/authenticate`

2. **Update shopify.app.toml** (local file):
   ```toml
   application_url = "https://your-railway-domain.railway.app"
   
   [auth]
   redirect_urls = [ "https://your-railway-domain.railway.app/authenticate" ]
   ```

3. **Test the deployment**:
   - Install the app on a test Shopify store
   - Verify webhook registration works
   - Check database connections

## Troubleshooting

### Build Fails
- Check Railway logs for specific error
- Ensure all dependencies in composer.json are compatible with PHP 8.3
- Verify nixpacks.toml syntax

### Database Connection Issues
- Ensure `DATABASE_URL` is present in variables
- Check `DB_CONNECTION=pgsql` is set
- Verify PostgreSQL service is running

### Session/Cookie Issues in Shopify
- Ensure `SESSION_SECURE_COOKIE=true`
- Ensure `SESSION_SAME_SITE=none`
- Verify APP_URL uses https://

### Webhook Delivery Failures
- Verify APP_URL is correct
- Check webhook endpoint is accessible: `/webhooks/shopify`
- Review logs for incoming webhook errors

## Queue Worker (Optional)
To run background jobs:
1. Add a new service in Railway project
2. Use the same GitHub repo
3. Set start command to: `php artisan queue:work --tries=3 --timeout=90`
4. Use the same environment variables

## Monitoring
- Check Railway logs: Dashboard → Service → Deployments → Logs
- Monitor Laravel logs: `storage/logs/laravel.log`
- Use Railway's built-in metrics for performance

## Important Notes
- Never commit .env file to git
- Keep SHOPIFY_API_SECRET secure
- Rotate APP_KEY if compromised
- Monitor database size (Railway free tier has limits)
- Set up proper error tracking (Sentry, Bugsnag, etc.)
