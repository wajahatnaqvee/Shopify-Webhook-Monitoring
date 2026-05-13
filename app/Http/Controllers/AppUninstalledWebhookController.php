<?php

namespace App\Http\Controllers;

use App\Jobs\AppUninstalledJob;
use App\Services\Shopify\ShopifyWebhookVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AppUninstalledWebhookController extends Controller
{
    public function handle(
        Request $request,
        ShopifyWebhookVerifier $verifier
    ): JsonResponse {
        Log::info('APP UNINSTALLED WEBHOOK CONTROLLER HIT', [
            'method' => $request->method(),
            'shop' => $request->header('X-Shopify-Shop-Domain'),
            'topic' => $request->header('X-Shopify-Topic'),
            'webhook_id' => $request->header('X-Shopify-Webhook-Id'),
            'hmac_exists' => $request->hasHeader('X-Shopify-Hmac-Sha256'),
            'content_length' => strlen($request->getContent()),
        ]);

        $rawBody = $request->getContent();
        $hmacHeader = $request->header('X-Shopify-Hmac-Sha256');

        if (!$verifier->verify($rawBody, $hmacHeader)) {
            Log::warning('APP UNINSTALLED WEBHOOK HMAC FAILED', [
                'shop' => $request->header('X-Shopify-Shop-Domain'),
                'topic' => $request->header('X-Shopify-Topic'),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Invalid webhook signature.',
            ], 401);
        }

        $topic = $request->header('X-Shopify-Topic');
        $shopDomain = $request->header('X-Shopify-Shop-Domain');

        Log::info('APP UNINSTALLED WEBHOOK HMAC PASSED', [
            'shop_domain' => $shopDomain,
            'topic' => $topic,
        ]);

        if ($topic !== 'app/uninstalled') {
            Log::warning('APP UNINSTALLED WEBHOOK INVALID TOPIC', [
                'received_topic' => $topic,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Invalid webhook topic.',
            ], 400);
        }

        if (!$shopDomain) {
            Log::warning('APP UNINSTALLED WEBHOOK MISSING SHOP DOMAIN');

            return response()->json([
                'success' => false,
                'message' => 'Missing shop domain.',
            ], 400);
        }

        try {
            AppUninstalledJob::dispatch(
                $shopDomain,
                json_decode($rawBody, true) ?? []
            );

            Log::info('APP UNINSTALLED CLEANUP JOB DISPATCHED', [
                'shop_domain' => $shopDomain,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'App uninstall cleanup queued.',
            ], 200);
        } catch (\Throwable $e) {
            Log::error('APP UNINSTALLED CLEANUP FAILED', [
                'shop_domain' => $shopDomain,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'App uninstall cleanup failed.',
            ], 500);
        }
    }
}
