<?php

namespace App\Listeners;

use App\Models\WebhookSubscription;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Osiset\ShopifyApp\Messaging\Events\AppUninstalledEvent;

class HandleAppUninstalled
{
    /**
     * Handle the AppUninstalledEvent.
     *
     * When a shop uninstalls the app:
     * 1. Mark all their active webhook subscriptions as deleted locally.
     *    (Shopify already removed them on their side when the app was uninstalled.)
     * 2. This prevents stale "active" rows from showing up if the shop reinstalls later,
     *    before they run a Sync.
     */
    public function handle(AppUninstalledEvent $event): void
    {
        // $event->shop is our App\Models\User acting as ShopModel.
        // Look up via DB to get a typed User instance the IDE understands.
        $shopDomain = $event->shop->getDomain()->toNative();
        $user = User::where('name', $shopDomain)->first();

        if ($user === null) {
            Log::warning('AppUninstalledEvent: shop/user not found on event');
            return;
        }

        $updated = WebhookSubscription::where('user_id', $user->id)
            ->whereIn('status', ['active', 'missing_on_shopify', 'failed'])
            ->update([
                'status'                  => 'deleted',
                'last_synced_at'          => now(),
                'last_error'              => 'App was uninstalled. Shopify removed all webhook subscriptions.',
                'shopify_subscription_id' => null,
            ]);

        Log::info('AppUninstalledEvent: cleared webhook subscriptions for shop', [
            'user_id'       => $user->id,
            'shop'          => $user->name,
            'rows_affected' => $updated,
        ]);
    }
}
