#!/bin/bash

# Exit on error
set -e

PORT="${PORT:-8080}"

echo "Starting deployment..."

# Create storage symlink if it doesn't exist
php artisan storage:link --force || true

# Clear any stale cached config from build phase
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Run database migrations with retries because Railway DB can come up slightly later
echo "Running migrations..."
max_attempts=12
attempt=1
until php artisan migrate --force --no-interaction; do
	if [ "$attempt" -ge "$max_attempts" ]; then
		echo "Migration failed after $max_attempts attempts."
		exit 1
	fi

	echo "Migration attempt $attempt failed. Retrying in 5 seconds..."
	attempt=$((attempt + 1))
	sleep 5
done

# Now cache with real runtime env values
echo "Optimizing application..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Start the web server on Railway's assigned port
echo "Starting web server on port $PORT..."
php artisan serve --host=0.0.0.0 --port=$PORT --no-reload
