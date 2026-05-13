<?php

namespace App\Http\Middleware;

use App\Services\Shopify\ShopifyWebhookSubscriptionService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class EnsureSystemWebhooksRegistered
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return $next($request);
        }

        /*
         * Prevent registering on every page load.
         * This runs once every 24 hours per shop, and immediately after install
         * because cache will not exist yet.
         */
        $cacheKey = "system-webhooks-checked:user:{$user->id}";

        if (!Cache::has($cacheKey)) {
            try {
                app(ShopifyWebhookSubscriptionService::class)
                    ->registerSystemRequired($user);

                Cache::put($cacheKey, true, now()->addDay());
            } catch (\Throwable $e) {
                Log::error('Unable to ensure system webhooks are registered', [
                    'user_id' => $user->id,
                    'shop' => $user->name ?? null,
                    'message' => $e->getMessage(),
                ]);

                /*
                 * Do not break the app UI if this fails.
                 * Log it and continue.
                 */
            }
        }

        return $next($request);
    }
}