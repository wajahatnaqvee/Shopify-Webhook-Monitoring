<?php

namespace App\Jobs;

use App\Services\Shopify\ShopDataCleanupService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class AppUninstalledJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public string $shopDomain;

    public array $data;

    public function __construct(string $shopDomain, array|object|null $data = [])
    {
        $this->shopDomain = $shopDomain;

        if (is_object($data)) {
            $this->data = json_decode(json_encode($data), true) ?? [];
        } else {
            $this->data = $data ?? [];
        }
    }

    public function handle(): void
    {
        Log::info('APP UNINSTALLED JOB HIT', [
            'shop_domain' => $this->shopDomain,
            'data' => $this->data,
        ]);

        app(ShopDataCleanupService::class)->cleanupByShopDomain(
            shopDomain: $this->shopDomain,
            reason: 'app_uninstalled'
        );

        Log::info('APP UNINSTALLED JOB CLEANUP COMPLETED', [
            'shop_domain' => $this->shopDomain,
        ]);
    }
}