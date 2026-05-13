<?php

namespace App\Http\Controllers;

use App\Services\Shopify\ShopifyWebhookEventService;
use App\Services\Shopify\ShopifyWebhookVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Jobs\ProcessWebhookEventJob;
use App\Services\Shopify\ShopDataCleanupService;

class ShopifyWebhookController extends Controller
{
    public function handle(
        Request $request,
        ShopifyWebhookVerifier $verifier,
        ShopifyWebhookEventService $eventService
    ): JsonResponse {
        logger('SHOPIFY WEBHOOK HIT', [
            'shop'        => $request->header('X-Shopify-Shop-Domain'),
            'topic'       => $request->header('X-Shopify-Topic'),
            'webhook_id'  => $request->header('X-Shopify-Webhook-Id'),
            'hmac_exists' => $request->hasHeader('X-Shopify-Hmac-Sha256'),
        ]);

        $rawBody    = $request->getContent();
        $hmacHeader = $request->header('X-Shopify-Hmac-Sha256');

        if (!$verifier->verify($rawBody, $hmacHeader)) {
            logger('SHOPIFY WEBHOOK HMAC FAILED', [
                'shop'  => $request->header('X-Shopify-Shop-Domain'),
                'topic' => $request->header('X-Shopify-Topic'),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Invalid webhook signature.',
            ], 401);
        }

        logger('SHOPIFY WEBHOOK HMAC PASSED', [
            'shop'  => $request->header('X-Shopify-Shop-Domain'),
            'topic' => $request->header('X-Shopify-Topic'),
        ]);

        try {
            logger('BEFORE STORE WEBHOOK EVENT');



            $topic = $request->header('X-Shopify-Topic');
            $shopDomain = $request->header('X-Shopify-Shop-Domain');

            if ($topic === 'app/uninstalled') {
                logger('APP UNINSTALLED WEBHOOK RECEIVED', [
                    'shop_domain' => $shopDomain,
                ]);

                if (!$shopDomain) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Missing shop domain.',
                    ], 400);
                }

                app(ShopDataCleanupService::class)->cleanupByShopDomain(
                    shopDomain: $shopDomain,
                    reason: 'app_uninstalled'
                );

                return response()->json([
                    'success' => true,
                    'message' => 'App uninstall cleanup completed.',
                ], 200);
            }
            $event = $eventService->store($request, $rawBody);
            logger('AFTER STORE WEBHOOK EVENT', [
                'event_id' => $event->id,
                'status'   => $event->status,
            ]);
            if ($event->status === 'pending') {
                ProcessWebhookEventJob::dispatch($event->id);
            }
        } catch (\Throwable $e) {
            logger()->error('WEBHOOK STORE FAILED', [
                'message' => $e->getMessage(),
                'trace'   => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Webhook received but could not be stored.',
            ], 500);
        }

        return response()->json([
            'success'  => true,
            'message'  => 'Webhook received.',
            'event_id' => $event->id,
            'status'   => $event->status,
        ], 200);
    }
}
