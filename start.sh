#!/bin/bash

# Exit on error
set -e

echo "Starting deployment..."

# Create storage symlink if it doesn't exist
php artisan storage:link --force || true

# Clear any stale cached config from build phase
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Run database migrations
echo "Running migrations..."
php artisan migrate --force --no-interaction

# Now cache with real runtime env values
echo "Optimizing application..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Start the web server on Railway's assigned port
echo "Starting web server on port $PORT..."
php artisan serve --host=0.0.0.0 --port=$PORT --no-reload
