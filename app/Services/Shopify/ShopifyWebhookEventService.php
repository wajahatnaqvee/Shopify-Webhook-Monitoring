<?php

namespace App\Services\Shopify;

use App\Models\User;
use App\Models\WebhookEvent;
use App\Models\WebhookSubscription;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ShopifyWebhookEventService
{
    public function store(Request $request, string $rawBody): WebhookEvent
    {
        $shopDomain  = $request->header('X-Shopify-Shop-Domain');
        $topic       = $request->header('X-Shopify-Topic');
        $webhookId   = $request->header('X-Shopify-Webhook-Id');
        $apiVersion  = $request->header('X-Shopify-Api-Version');
        $triggeredAt = $request->header('X-Shopify-Triggered-At');

        logger('STORE SERVICE STARTED', [
            'shop_domain' => $shopDomain,
            'topic'       => $topic,
            'webhook_id'  => $webhookId,
            'api_version' => $apiVersion,
        ]);

        $topicDefinition = WebhookTopicRegistry::findByHeader($topic);

        if ($topicDefinition) {
            logger('TOPIC DEFINITION FOUND', ['topic_enum' => $topicDefinition['topic_enum']]);
        } else {
            logger('TOPIC DEFINITION NOT FOUND', ['topic' => $topic]);
        }

        $user = $this->findUserByShopDomain($shopDomain);

        if ($user) {
            logger('USER FOUND FOR WEBHOOK', [
                'user_id'     => $user->id,
                'shop_domain' => $user->name,
            ]);
        } else {
            logger('USER NOT FOUND FOR WEBHOOK', ['shop_domain' => $shopDomain]);
        }

        $subscription = null;

        if ($user && $topicDefinition) {
            $subscription = WebhookSubscription::where('user_id', $user->id)
                ->where('topic_header', $topic)
                ->where('status', 'active')
                ->first();

            if ($subscription) {
                logger('SUBSCRIPTION FOUND', ['subscription_id' => $subscription->id]);
            } else {
                logger('SUBSCRIPTION NOT FOUND', ['user_id' => $user->id, 'topic' => $topic]);
            }
        }

        // Duplicate protection — same shop + same Shopify webhook ID = same delivery.
        if ($shopDomain && $webhookId) {
            $existing = WebhookEvent::where('shop_domain', $shopDomain)
                ->where('webhook_id', $webhookId)
                ->first();

            if ($existing) {
                logger('DUPLICATE FOUND', [
                    'existing_event_id' => $existing->id,
                    'webhook_id'        => $webhookId,
                ]);

                return $existing;
            }
        }

        $status = ($topicDefinition && ($topicDefinition['supported'] ?? false))
            ? 'pending'
            : 'ignored';

        $decodedPayload = json_decode($rawBody, true) ?? [];
        $resourceMeta   = ResourceMetadataExtractor::extract($topic ?? '', $decodedPayload);

        logger('CREATING WEBHOOK EVENT', [
            'shop_domain' => $shopDomain,
            'topic'       => $topic,
            'status'      => $status,
        ]);

        $event = WebhookEvent::create([
            'user_id'                 => $user?->id,
            'webhook_subscription_id' => $subscription?->id,
            'shop_domain'             => $shopDomain,
            'topic'                   => $topic,
            'topic_enum'              => $topicDefinition['topic_enum'] ?? null,
            'group'                   => $topicDefinition['group'] ?? null,
            'action'                  => $topicDefinition['action'] ?? null,
            'webhook_id'              => $webhookId,
            'api_version'             => $apiVersion,
            'triggered_at'            => $triggeredAt ? Carbon::parse($triggeredAt) : null,
            'payload'                 => $decodedPayload,
            'headers'                 => $request->headers->all(),
            'status'                  => $status,
            'attempts'                => 0,
            'received_at'             => now(),
            ...$resourceMeta,
        ]);

        logger('WEBHOOK EVENT CREATED', [
            'event_id' => $event->id,
            'status'   => $event->status,
        ]);

        return $event;
    }

    private function findUserByShopDomain(?string $shopDomain): ?User
    {
        if (!$shopDomain) {
            return null;
        }

        return User::where('name', $shopDomain)->first();
    }
}
