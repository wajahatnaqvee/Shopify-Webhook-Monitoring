<?php

namespace App\Services\Shopify;

use App\Models\JobLog;
use App\Models\User;
use App\Models\WebhookEvent;
use App\Models\WebhookEventAttempt;
use App\Models\WebhookSubscription;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class ShopDataCleanupService
{
    public function cleanupByShopDomain(string $shopDomain, string $reason = 'app_uninstalled'): void
    {
        DB::transaction(function () use ($shopDomain, $reason) {
            $user = User::where('name', $shopDomain)->first();

            Log::info('SHOP DATA CLEANUP STARTED', [
                'shop_domain' => $shopDomain,
                'user_id' => $user?->id,
                'reason' => $reason,
            ]);

            $eventQuery = WebhookEvent::query()
                ->where('shop_domain', $shopDomain);

            if ($user) {
                $eventQuery->orWhere('user_id', $user->id);
            }

            $eventIds = $eventQuery->pluck('id');

            Log::info('SHOP DATA CLEANUP EVENT IDS FOUND', [
                'shop_domain' => $shopDomain,
                'event_count' => $eventIds->count(),
            ]);

            if ($eventIds->isNotEmpty()) {
                WebhookEventAttempt::whereIn('webhook_event_id', $eventIds)->delete();
                JobLog::whereIn('webhook_event_id', $eventIds)->delete();
                WebhookEvent::whereIn('id', $eventIds)->delete();
            }

            $subscriptionQuery = WebhookSubscription::query()
                ->where('shop_domain', $shopDomain);

            if ($user) {
                $subscriptionQuery->orWhere('user_id', $user->id);
            }

            $deletedSubscriptions = $subscriptionQuery->delete();

            Log::info('SHOP DATA CLEANUP SUBSCRIPTIONS DELETED', [
                'shop_domain' => $shopDomain,
                'deleted_subscriptions' => $deletedSubscriptions,
            ]);

            if ($user) {
                if (Schema::hasTable('sessions') && Schema::hasColumn('sessions', 'user_id')) {
                    DB::table('sessions')
                        ->where('user_id', $user->id)
                        ->delete();
                }

                $userId = $user->id;
                $user->delete();

                Log::info('SHOP DATA CLEANUP USER DELETED', [
                    'shop_domain' => $shopDomain,
                    'user_id' => $userId,
                ]);
            } else {
                Log::warning('SHOP DATA CLEANUP USER NOT FOUND', [
                    'shop_domain' => $shopDomain,
                ]);
            }

            Log::info('SHOP DATA CLEANUP COMPLETED', [
                'shop_domain' => $shopDomain,
                'reason' => $reason,
            ]);
        });
    }
}