<?php

namespace App\Http\Controllers;

use App\Models\WebhookSubscription;
use App\Services\Shopify\ShopifyWebhookSubscriptionService;
use App\Services\Shopify\WebhookTopicRegistry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WebhookSubscriptionController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $topics = collect(WebhookTopicRegistry::all())
            ->reject(fn (array $topic) => ($topic['group'] ?? null) === 'System')
            ->values()
            ->all();

        // Load any locally stored subscription rows for this shop.
        // Keyed by topic_enum so the frontend can do a fast lookup per topic.
        $subscriptions = $user
            ? WebhookSubscription::where('user_id', $user->id)
                ->get()
                ->keyBy('topic_enum')
            : collect();

        return Inertia::render('WebhookSubscriptions/Index', [
            'topics'        => $topics,
            'subscriptions' => $subscriptions,
        ]);
    }

    public function register(Request $request): RedirectResponse
    {
        $request->validate([
            'topic_enum' => ['required', 'string'],
        ]);

        $topicEnum = strtoupper(trim($request->input('topic_enum')));

        // Resolve topic definition from registry.
        $topicDef = WebhookTopicRegistry::findByEnum($topicEnum);

        if ($topicDef === null) {
            return back()->with('error', "Unknown webhook topic: {$topicEnum}.");
        }

        if (!($topicDef['supported'] ?? true)) {
            return back()->with('error', "Topic {$topicEnum} is not yet supported. " . ($topicDef['unsupported_reason'] ?? ''));
        }

        $user = $request->user();

        if ($user === null) {
            return back()->with('error', 'No authenticated shop found.');
        }

        try {
            $service = new ShopifyWebhookSubscriptionService();
            $subscription = $service->register($topicDef, $user);

            // If the returned subscription was already active (duplicate prevention).
            if ($subscription->wasRecentlyCreated === false && $subscription->status === 'active' && !$subscription->isDirty()) {
                return back()->with('info', "This webhook ({$topicDef['title']}) is already registered and active.");
            }

            return back()->with('success', "Webhook \"{$topicDef['title']}\" registered successfully.");
        } catch (\InvalidArgumentException $e) {
            return back()->with('error', $e->getMessage());
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function destroy(Request $request, WebhookSubscription $webhookSubscription): RedirectResponse
    {
        $user = $request->user();

        if ($user === null) {
            return back()->with('error', 'No authenticated shop found.');
        }

        // Ownership check — prevent one shop touching another shop's data.
        if ($webhookSubscription->user_id !== $user->id) {
            abort(403);
        }

        // Already deleted — nothing to do.
        if ($webhookSubscription->status === 'deleted') {
            return back()->with('info', "This webhook ({$webhookSubscription->title}) is already deleted.");
        }

        // No Shopify ID — mark deleted locally without calling Shopify.
        if (empty($webhookSubscription->shopify_subscription_id)) {
            $webhookSubscription->status         = 'deleted';
            $webhookSubscription->last_synced_at = now();
            $webhookSubscription->last_error     = null;
            $webhookSubscription->save();
            return back()->with('info', 'Local subscription marked as deleted because no Shopify subscription ID was found.');
        }

        try {
            $service = new ShopifyWebhookSubscriptionService();
            $service->delete($user, $webhookSubscription);
            return back()->with('success', "Webhook \"{$webhookSubscription->title}\" deleted successfully.");
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

   public function sync(Request $request): RedirectResponse
{
    logger('SYNC METHOD HIT');

    $user = $request->user();

    if ($user === null) {
        logger('SYNC ERROR: No authenticated shop found');

        return back()->with('error', 'No authenticated shop found.');
    }

    try {
        $service = new ShopifyWebhookSubscriptionService();
        $summary = $service->sync($user);

        $summary = array_merge([
            'total_from_shopify' => 0,
            'created' => 0,
            'updated' => 0,
            'missing' => 0,
            'skipped' => 0,
            'failed' => 0,
            'errors' => [],
        ], $summary);

        logger('SYNC SUMMARY', $summary);

        $parts = [
            "Total from Shopify: {$summary['total_from_shopify']}",
            "Created: {$summary['created']}",
            "Updated: {$summary['updated']}",
            "Missing: {$summary['missing']}",
            "Skipped: {$summary['skipped']}",
        ];

        if ($summary['failed'] > 0) {
            $parts[] = "Failed: {$summary['failed']}";
        }

        $message = 'Sync completed. ' . implode(', ', $parts) . '.';

        logger('SYNC FLASH MESSAGE: ' . $message);

        if ($summary['failed'] > 0) {
            return back()
                ->with('info', $message)
                ->with('sync_summary', $summary);
        }

        return back()
            ->with('success', $message)
            ->with('sync_summary', $summary);

    } catch (\RuntimeException $e) {
        logger('SYNC EXCEPTION: ' . $e->getMessage());

        return back()->with('error', $e->getMessage());
    }
}


public function registerRecommended(Request $request): RedirectResponse
{
    $user = $request->user();

    if ($user === null) {
        return back()->with('error', 'No authenticated shop found.');
    }

    try {
        $registry = app(WebhookTopicRegistry::class);
        $service = new ShopifyWebhookSubscriptionService();

        $recommendedTopics = $registry->recommended();

        $summary = [
            'total_recommended' => count($recommendedTopics),
            'registered' => 0,
            'already_active' => 0,
            'unsupported' => 0,
            'failed' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

        foreach ($recommendedTopics as $topic) {
            $topicEnum = $topic['topic_enum'] ?? null;

            if (!$topicEnum) {
                $summary['skipped']++;
                continue;
            }

            if (($topic['supported'] ?? true) === false) {
                $summary['unsupported']++;
                continue;
            }

            $existing = \App\Models\WebhookSubscription::where('user_id', $user->id)
                ->where('topic_enum', $topicEnum)
                ->first();

            if (
                $existing &&
                $existing->status === 'active' &&
                !empty($existing->shopify_subscription_id)
            ) {
                $summary['already_active']++;
                continue;
            }

            try {
                // Your service expects: register(array $topicDef, User $user)
                $subscription = $service->register($topic, $user);

                if ($subscription->status === 'active') {
                    $summary['registered']++;
                } else {
                    $summary['failed']++;
                    $summary['errors'][] = "{$topicEnum}: Could not activate this webhook.";
                }
            } catch (\Throwable $e) {
                logger()->error('Recommended webhook registration failed', [
                    'topic_enum' => $topicEnum,
                    'message' => $e->getMessage(),
                ]);

                $summary['failed']++;

                // Keep UI message clean. Do not expose full PHP exception.
                $summary['errors'][] = "{$topicEnum}: Could not register this webhook.";
            }
        }

        $message = "Recommended webhook registration completed. Registered: {$summary['registered']}, Already active: {$summary['already_active']}, Unsupported: {$summary['unsupported']}, Failed: {$summary['failed']}.";

        return back()
            ->with($summary['failed'] > 0 ? 'info' : 'success', $message)
            ->with('recommended_summary', $summary);
    } catch (\Throwable $e) {
        logger()->error('Recommended webhook registration crashed', [
            'message' => $e->getMessage(),
        ]);

        return back()->with('error', 'Recommended webhook registration failed. Please check logs.');
    }
}







}
