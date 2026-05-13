<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Osiset\ShopifyApp\Actions\CreateWebhooks;
use Osiset\ShopifyApp\Contracts\Objects\Values\ShopId as ShopIdValue;
use Osiset\ShopifyApp\Objects\Values\ShopId;

class RegisterShopifyWebhooks extends Command
{
    protected $signature = 'shopify:register-webhooks {--shop= : Limit to a specific shop domain}';

    protected $description = 'Register Shopify webhooks for all installed shops (re-registration safe)';

    public function handle(CreateWebhooks $createWebhooks): int
    {
        $configWebhooks = config('shopify-app.webhooks', []);

        if (empty($configWebhooks)) {
            $this->error('No webhooks defined in config/shopify-app.php.');
            return self::FAILURE;
        }

        $query = User::whereNotNull('password');

        if ($shopDomain = $this->option('shop')) {
            $query->where('name', $shopDomain);
        }

        $shops = $query->get();

        if ($shops->isEmpty()) {
            $this->error('No installed shops found.');
            return self::FAILURE;
        }

        foreach ($shops as $shop) {
            $this->line("Processing: {$shop->name}");

            try {
                $shopId = ShopId::fromNative((int) $shop->id);
                $result = $createWebhooks($shopId, $configWebhooks);

                $created = count($result['created'] ?? []);
                $deleted = count($result['deleted'] ?? []);

                $this->info("  created: {$created}, deleted stale: {$deleted}");
            } catch (\Throwable $e) {
                $this->error("  FAILED: " . $e->getMessage());
            }
        }

        $this->info('Done.');
        return self::SUCCESS;
    }
}
