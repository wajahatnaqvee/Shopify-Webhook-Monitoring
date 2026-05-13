<?php

use App\Http\Controllers\AppUninstalledWebhookController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ShopifyWebhookController;
use App\Http\Controllers\WebhookEventController;
use App\Http\Controllers\WebhookSubscriptionController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;




Route::post('/webhooks/shopify', [ShopifyWebhookController::class, 'handle'])
    ->name('webhooks.shopify');

Route::post('/webhook/app-uninstalled', [AppUninstalledWebhookController::class, 'handle'])
    ->name('webhook.app-uninstalled');



Route::middleware(['verify.shopify'])->group(function () {





    



    Route::get('/', [DashboardController::class, 'index'])->name('home');
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/webhook-subscriptions', [WebhookSubscriptionController::class, 'index'])
        ->name('webhook-subscriptions.index');

    Route::post('/webhook-subscriptions/register', [WebhookSubscriptionController::class, 'register'])
        ->name('webhook-subscriptions.register');

    Route::delete('/webhook-subscriptions/{webhookSubscription}', [WebhookSubscriptionController::class, 'destroy'])
        ->name('webhook-subscriptions.destroy');

    Route::post('/webhook-subscriptions/sync', [WebhookSubscriptionController::class, 'sync'])
        ->name('webhook-subscriptions.sync');

    Route::get('/webhook-events', [WebhookEventController::class, 'index'])
        ->name('webhook-events.index');

        Route::get('/webhook-events/{webhookEvent}', [WebhookEventController::class, 'show'])
    ->name('webhook-events.show');

    Route::post('/webhook-events/{webhookEvent}/replay', [WebhookEventController::class, 'replay'])
    ->name('webhook-events.replay');
    
    Route::post('/webhook-subscriptions/register-recommended', [WebhookSubscriptionController::class, 'registerRecommended'])
    ->name('webhook-subscriptions.register-recommended');
});