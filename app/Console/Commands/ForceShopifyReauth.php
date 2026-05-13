<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class ForceShopifyReauth extends Command
{
    protected $signature = 'shopify:force-reauth {shop? : The myshopify.com domain to reset. Omit to reset all shops.}';

    protected $description = 'Clear the stored Shopify access token so the OAuth flow runs again on next app open.';

    public function handle(): int
    {
        $shopDomain = $this->argument('shop');

        $query = User::withTrashed();

        if ($shopDomain) {
            $query->where('name', $shopDomain);
        }

        $shops = $query->get();

        if ($shops->isEmpty()) {
            $this->error('No shops found' . ($shopDomain ? " for domain: {$shopDomain}" : '.'));
            return self::FAILURE;
        }

        foreach ($shops as $shop) {
            // Restore soft-deleted shops so they are visible for re-auth.
            if ($shop->trashed()) {
                $shop->restore();
            }

            // Set token to empty string (column is NOT NULL).
            // AccessToken::isEmpty() returns true for '', which makes
            // SessionContext::isValid() return false, forcing the verify.shopify
            // middleware to trigger the full OAuth install redirect.
            $shop->password = '';
            $shop->save();

            $this->info("Cleared token for: {$shop->name}");
        }

        $this->newLine();
        $this->info('Done. The shop(s) above will be prompted to re-authorize the app next time they open it in Shopify admin.');
        $this->line('After re-auth, run: php artisan shopify:register-webhooks');

        return self::SUCCESS;
    }
}
