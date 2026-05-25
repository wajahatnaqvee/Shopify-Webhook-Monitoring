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
        // When the session expires while inside the embedded app, the Kyon
        // VerifyShopify middleware may redirect to /authenticate without a
        // ?shop= param, causing MissingShopDomainException (HTTP 500).
        // Instead, return a clear 401 so the frontend can reload.
        $exceptions->render(function (
            \Osiset\ShopifyApp\Exceptions\MissingShopDomainException $e,
            \Illuminate\Http\Request $request
        ) {
            if ($request->header('X-Inertia')) {
                return response()->json([
                    'message' => 'Your session has expired. Please reload the app from Shopify admin.',
                ], 401);
            }

            return redirect('/')->with(
                'error',
                'Your session has expired. Please open the app from Shopify admin.'
            );
        });
    })->create();
