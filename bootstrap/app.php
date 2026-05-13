<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Shopify embedded apps run inside an iframe on admin.shopify.com.
        // Browser SameSite=Lax restrictions prevent the Laravel session cookie
        // from being sent cross-site, so the XSRF token is never available.
        // All routes here are protected by verify.shopify instead.
        $middleware->validateCsrfTokens(except: [
            'webhook-subscriptions/*',
            'webhooks/shopify',
            'webhook-events/*/replay',
                'webhook/*',
             'webhook/app-uninstalled',
        ]);

        $middleware->alias([
        'auth.proxy' => \Osiset\ShopifyApp\Http\Middleware\AuthProxy::class,
        'auth.webhook' => \Osiset\ShopifyApp\Http\Middleware\AuthWebhook::class,
        'billable' => \Osiset\ShopifyApp\Http\Middleware\Billable::class,
        'iframe.protection' => \Osiset\ShopifyApp\Http\Middleware\IframeProtection::class,
        'verify.scopes' => \Osiset\ShopifyApp\Http\Middleware\VerifyScopes::class,
        'verify.shopify' => \Osiset\ShopifyApp\Http\Middleware\VerifyShopify::class,
         'system.webhooks' => \App\Http\Middleware\EnsureSystemWebhooksRegistered::class,
    ]);

        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
