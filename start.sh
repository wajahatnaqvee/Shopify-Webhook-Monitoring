#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment..."

# Create storage symlink if it doesn't exist
php artisan storage:link || true

# Run database migrations
echo "📦 Running migrations..."
php artisan migrate --force --no-interaction

# Clear and cache config
echo "⚙️ Optimizing application..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Start the web server on Railway's assigned port
echo "✅ Starting web server on port $PORT..."
php artisan serve --host=0.0.0.0 --port=$PORT --no-reload
