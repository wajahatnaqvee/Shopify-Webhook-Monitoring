<?php

namespace App\Services\Shopify;

class ShopifyWebhookVerifier
{
public function verify(string $rawBody, ?string $hmacHeader): bool
{
    if (empty($hmacHeader)) {
        return false;
    }

    $secret = config('shopify-app.api_secret');

    if (empty($secret)) {
        return false;
    }

    $calculatedHmac = base64_encode(
        hash_hmac('sha256', $rawBody, $secret, true)
    );

    return hash_equals($calculatedHmac, $hmacHeader);
}
}