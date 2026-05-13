<?php

namespace App\Services\Shopify;

use App\Models\User;
use App\Models\WebhookSubscription;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class ShopifyWebhookSubscriptionService
{
    /**
     * The GraphQL mutation used to create a webhook subscription on Shopify.
     */
    private const MUTATION_DELETE = <<<'GQL'
    mutation webhookSubscriptionDelete($id: ID!) {
        webhookSubscriptionDelete(id: $id) {
            deletedWebhookSubscriptionId
            userErrors {
                field
                message
            }
        }
    }
    GQL;

    private const QUERY_EXISTING = <<<'GQL'
    query webhookSubscriptionsForTopic($topic: WebhookSubscriptionTopic!) {
        webhookSubscriptions(first: 5, topics: [$topic]) {
            edges {
                node {
                    id
                    topic
                    callbackUrl
                    format
                    includeFields
                    metafieldNamespaces
                }
            }
        }
    }
    GQL;

    private const QUERY_ALL = <<<'GQL'
    query webhookSubscriptions($first: Int!, $after: String) {
        webhookSubscriptions(first: $first, after: $after) {
            edges {
                cursor
                node {
                    id
                    topic
                    callbackUrl
                    format
                    filter
                    includeFields
                    metafieldNamespaces
                    createdAt
                    updatedAt
                }
            }
            pageInfo {
                hasNextPage
                endCursor
            }
        }
    }
    GQL;

    private const MUTATION = <<<'GQL'
    mutation webhookSubscriptionCreate(
        $topic: WebhookSubscriptionTopic!,
        $webhookSubscription: WebhookSubscriptionInput!
    ) {
        webhookSubscriptionCreate(
            topic: $topic,
            webhookSubscription: $webhookSubscription
        ) {
            webhookSubscription {
                id
                topic
                uri: callbackUrl
                format
                includeFields
                metafieldNamespaces
            }
            userErrors {
                field
                message
            }
        }
    }
    GQL;

    /**
     * Register a webhook subscription on Shopify for the given topic/user.
     *
     * Returns the saved WebhookSubscription model on success.
     * Saves a failed row and throws RuntimeException on Shopify userErrors.
     *
     * @param  array  $topicDef   A topic definition array from WebhookTopicRegistry.
     * @param  User   $user       The authenticated shop/user model.
     * @return WebhookSubscription
     *
     * @throws \InvalidArgumentException  When the endpoint URL is invalid.
     * @throws RuntimeException           When Shopify returns userErrors.
     */
    public function register(array $topicDef, User $user): WebhookSubscription
    {
        // Use a topic-specific endpoint path if defined (e.g. app/uninstalled),
        // otherwise fall back to the general /webhooks/shopify monitor endpoint.
        $endpointUrl = isset($topicDef['endpoint_path'])
            ? rtrim(config('app.url'), '/') . $topicDef['endpoint_path']
            : $this->buildEndpointUrl();

        $this->validateEndpointUrl($endpointUrl);

        // Prevent duplicate active subscription for the same shop + topic + endpoint.
        $existing = WebhookSubscription::where('user_id', $user->id)
            ->where('topic_enum', $topicDef['topic_enum'])
            ->where('endpoint_url', $endpointUrl)
            ->where('status', 'active')
            ->first();

        if ($existing) {
            return $existing;
        }

        // Find or initialise a local row so we can save error state if the call fails.
        $localRow = WebhookSubscription::firstOrNew([
            'user_id'    => $user->id,
            'topic_enum' => $topicDef['topic_enum'],
        ]);

        $variables = [
            'topic'               => $topicDef['topic_enum'],
            'webhookSubscription' => [
                'callbackUrl' => $endpointUrl,
                'format'      => 'JSON',
            ],
        ];

        try {
            $result = $user->api()->graph(self::MUTATION, $variables);
        } catch (\Throwable $e) {
            $this->markFailed($localRow, $topicDef, $user, $endpointUrl, $e->getMessage());
            throw new RuntimeException(
                'Shopify API call failed: ' . $e->getMessage(),
                0,
                $e
            );
        }

        // Check for HTTP-level errors (RequestException caught by the library).
        // $result['errors'] === true means the HTTP request itself failed.
        if ($result['errors'] === true) {
            $status = $result['status'] ?? 'unknown';
            $msg    = "Shopify API request failed (HTTP {$status}).";
            $bodyStr = null;
            try {
                $bodyStr = json_encode($result['body']->container ?? null);
            } catch (\Throwable) {}
            \Illuminate\Support\Facades\Log::error('Shopify webhookSubscriptionCreate HTTP failure', [
                'topic'         => $topicDef['topic_enum'],
                'status'        => $status,
                'response_body' => $bodyStr,
                'shop'          => $user->name ?? null,
                'endpoint_url'  => $endpointUrl,
                'has_token'     => !empty($user->password),
            ]);
            $this->markFailed($localRow, $topicDef, $user, $endpointUrl, $msg);
            throw new RuntimeException($msg);
        }

        // Check for top-level GraphQL errors (auth/scope failures, syntax errors).
        // $result['errors'] is an array of {"message":...} objects when present.
        if ($result['errors'] !== false && !empty($result['errors'])) {
            $errorsRaw = $result['errors'];
            if (is_array($errorsRaw)) {
                $messages = array_map(
                    fn($e) => is_array($e) ? ($e['message'] ?? json_encode($e)) : (string) $e,
                    $errorsRaw
                );
                $msg = implode(' | ', $messages);
            } else {
                $msg = (string) $errorsRaw;
            }
            \Illuminate\Support\Facades\Log::error('Shopify webhookSubscriptionCreate GraphQL error', [
                'topic'  => $topicDef['topic_enum'],
                'errors' => $errorsRaw,
            ]);
            $this->markFailed($localRow, $topicDef, $user, $endpointUrl, $msg);
            throw new RuntimeException('Shopify GraphQL error: ' . $msg);
        }

        // ResponseAccess wraps everything in objects. Extract the raw PHP array once
        // so all downstream accesses use plain arrays with no wrapping surprises.
        $bodyArray = $result['body']->container ?? [];
        $payload = $bodyArray['data']['webhookSubscriptionCreate'] ?? null;

        if ($payload === null) {
            \Illuminate\Support\Facades\Log::error('Shopify webhookSubscriptionCreate: unexpected empty response', [
                'topic'  => $topicDef['topic_enum'],
                'status' => $result['status'] ?? null,
                'body'   => json_encode($bodyArray),
            ]);
            $msg = 'Shopify returned an unexpected empty response. Check laravel.log for details.';
            $this->markFailed($localRow, $topicDef, $user, $endpointUrl, $msg);
            throw new RuntimeException($msg);
        }

        $userErrors = $payload['userErrors'] ?? [];
        if (!empty($userErrors)) {
            $errorMessages = array_map(function ($e) {
                // field can be an array path like ["webhookSubscription","callbackUrl"]
                $field = $e['field'] ?? null;
                $fieldStr = is_array($field) ? implode('.', $field) : (string) ($field ?? '');
                $msg = (string) ($e['message'] ?? '');
                return trim("$fieldStr $msg");
            }, $userErrors);
            $joined = implode(' | ', array_filter($errorMessages));

            // Shopify returns "already been taken" when a subscription for this
            // topic+URL already exists. Import it from Shopify instead of failing.
            if (stripos($joined, 'already been taken') !== false) {
                return $this->importExistingFromShopify($localRow, $topicDef, $user, $endpointUrl);
            }

            $this->markFailed($localRow, $topicDef, $user, $endpointUrl, $joined ?: 'Unknown Shopify error');
            throw new RuntimeException('Shopify webhook registration failed: ' . ($joined ?: 'Unknown error'));
        }

        $shopifySub = $payload['webhookSubscription'] ?? [];

        // Persist success.
        $localRow->fill([
            'user_id'                  => $user->id,
            'shop_domain'              => $user->getDomain()->toNative(),
            'shopify_subscription_id'  => $shopifySub['id'] ?? null,
            'group'                    => $topicDef['group'],
            'action'                   => $topicDef['action'],
            'title'                    => $topicDef['title'],
            'topic_enum'               => $topicDef['topic_enum'],
            'topic_header'             => $topicDef['topic_header'],
            'endpoint_url'             => $endpointUrl,
            'format'                   => 'JSON',
            'required_scope'           => $topicDef['required_scope'] ?? null,
            'supported'                => $topicDef['supported'] ?? true,
            'unsupported_reason'       => $topicDef['unsupported_reason'] ?? null,
            'status'                   => 'active',
            'last_synced_at'           => now(),
            'last_error'               => null,
        ]);
        $localRow->save();

        return $localRow;
    }
public function registerSystemRequired(User $user): array
{
    $registry = app(WebhookTopicRegistry::class);

    $topics = $registry->systemRequired();

    $summary = [
        'total' => count($topics),
        'registered' => 0,
        'already_active' => 0,
        'failed' => 0,
        'errors' => [],
    ];

    foreach ($topics as $topic) {
        $topicEnum = $topic['topic_enum'] ?? null;

        if (!$topicEnum || ($topic['supported'] ?? true) === false) {
            continue;
        }

        $existing = WebhookSubscription::where('user_id', $user->id)
            ->where('topic_enum', $topicEnum)
            ->where('status', 'active')
            ->whereNotNull('shopify_subscription_id')
            ->first();

        if ($existing) {
            $summary['already_active']++;
            continue;
        }

        try {
            $subscription = $this->register($topic, $user);

            if ($subscription->status === 'active') {
                $summary['registered']++;
            } else {
                $summary['failed']++;
                $summary['errors'][] = "{$topicEnum}: Not active after registration.";
            }
        } catch (\Throwable $e) {
            $summary['failed']++;

            Log::error('System webhook registration failed', [
                'user_id' => $user->id,
                'shop' => $user->name,
                'topic_enum' => $topicEnum,
                'message' => $e->getMessage(),
            ]);

            $summary['errors'][] = "{$topicEnum}: Registration failed.";
        }
    }

    Log::info('System required webhooks checked', [
        'user_id' => $user->id,
        'shop' => $user->name,
        'summary' => $summary,
    ]);

    return $summary;
}
    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Delete a webhook subscription from Shopify and mark the local row deleted.
     *
     * If the local row has no shopify_subscription_id, skips the Shopify call
     * and just marks the local row deleted.
     *
     * @throws RuntimeException When Shopify returns userErrors or an HTTP failure.
     */
    public function delete(User $user, WebhookSubscription $subscription): void
    {
        // No Shopify ID — nothing to delete on Shopify side.
        if (empty($subscription->shopify_subscription_id)) {
            $subscription->status         = 'deleted';
            $subscription->last_synced_at = now();
            $subscription->last_error     = null;
            $subscription->save();
            return;
        }

        $result = $user->api()->graph(
            self::MUTATION_DELETE,
            ['id' => $subscription->shopify_subscription_id]
        );

        // HTTP-level failure (RequestException).
        if ($result['errors'] === true) {
            $status = $result['status'] ?? 'unknown';
            throw new RuntimeException("Shopify API request failed (HTTP {$status}).");
        }

        // Top-level GraphQL errors (auth, scope, etc.).
        if ($result['errors'] !== false && !empty($result['errors'])) {
            $errorsRaw = $result['errors'];
            $messages  = is_array($errorsRaw)
                ? array_map(fn($e) => is_array($e) ? ($e['message'] ?? json_encode($e)) : (string) $e, $errorsRaw)
                : [(string) $errorsRaw];
            throw new RuntimeException('Shopify GraphQL error: ' . implode(' | ', $messages));
        }

        $bodyArray = $result['body']->container ?? [];
        $payload   = $bodyArray['data']['webhookSubscriptionDelete'] ?? null;

        if ($payload === null) {
            \Illuminate\Support\Facades\Log::error('Shopify webhookSubscriptionDelete: unexpected empty response', [
                'shopify_id' => $subscription->shopify_subscription_id,
                'body'       => json_encode($bodyArray),
            ]);
            throw new RuntimeException('Shopify returned an unexpected empty response.');
        }

        $userErrors = $payload['userErrors'] ?? [];
        if (!empty($userErrors)) {
            $errorMessages = array_map(function ($e) {
                $field    = $e['field'] ?? null;
                $fieldStr = is_array($field) ? implode('.', $field) : (string) ($field ?? '');
                $msg      = (string) ($e['message'] ?? '');
                return trim("$fieldStr $msg");
            }, $userErrors);
            $joined = implode(' | ', array_filter($errorMessages)) ?: 'Unknown Shopify error';

            $subscription->last_error = $joined;
            $subscription->save();

            throw new RuntimeException('Shopify webhook deletion failed: ' . $joined);
        }

        // Success — Shopify confirmed deletion.
        $subscription->status         = 'deleted';
        $subscription->last_synced_at = now();
        $subscription->last_error     = null;
        $subscription->save();
    }

    /**
     * Shopify already has a subscription for this topic+URL.
     * Query Shopify for it and save it locally as active.
     */
    private function importExistingFromShopify(
        WebhookSubscription $localRow,
        array $topicDef,
        User $user,
        string $endpointUrl
    ): WebhookSubscription {
        $result = $user->api()->graph(self::QUERY_EXISTING, ['topic' => $topicDef['topic_enum']]);
        $bodyArray = $result['body']->container ?? [];
        $edges = $bodyArray['data']['webhookSubscriptions']['edges'] ?? [];

        $shopifySub = null;
        foreach ($edges as $edge) {
            $node = $edge['node'] ?? [];
            if (rtrim($node['callbackUrl'] ?? '', '/') === rtrim($endpointUrl, '/')) {
                $shopifySub = $node;
                break;
            }
        }

        $localRow->fill([
            'user_id'                 => $user->id,
            'shop_domain'             => $user->getDomain()->toNative(),
            'shopify_subscription_id' => $shopifySub['id'] ?? null,
            'group'                   => $topicDef['group'],
            'action'                  => $topicDef['action'],
            'title'                   => $topicDef['title'],
            'topic_enum'              => $topicDef['topic_enum'],
            'topic_header'            => $topicDef['topic_header'],
            'endpoint_url'            => $endpointUrl,
            'format'                  => 'JSON',
            'required_scope'          => $topicDef['required_scope'] ?? null,
            'supported'               => $topicDef['supported'] ?? true,
            'unsupported_reason'      => $topicDef['unsupported_reason'] ?? null,
            'status'                  => 'active',
            'last_synced_at'          => now(),
            'last_error'              => null,
        ]);
        $localRow->save();

        return $localRow;
    }

    /**
     * Build the webhook delivery URL from APP_URL.
     */
    private function buildEndpointUrl(): string
    {
        $base = config('app.url');

        if (empty($base)) {
            throw new \InvalidArgumentException(
                'APP_URL is not configured. Please set APP_URL in your .env file.'
            );
        }

        return rtrim($base, '/') . '/webhooks/shopify';
    }

    /**
     * Validate that the endpoint URL is HTTPS in non-local environments.
     */
    private function validateEndpointUrl(string $url): void
    {
        if (!app()->isLocal() && !str_starts_with($url, 'https://')) {
            throw new \InvalidArgumentException(
                'Webhook endpoint URL must use HTTPS. Current APP_URL: ' . $url
            );
        }
    }

    /**
     * Persist a failed state on the local row.
     */
    private function markFailed(
        WebhookSubscription $row,
        array $topicDef,
        User $user,
        string $endpointUrl,
        string $errorMessage
    ): void {
        $row->fill([
            'user_id'            => $user->id,
            'shop_domain'        => $user->getDomain()->toNative(),
            'group'              => $topicDef['group'],
            'action'             => $topicDef['action'],
            'title'              => $topicDef['title'],
            'topic_enum'         => $topicDef['topic_enum'],
            'topic_header'       => $topicDef['topic_header'],
            'endpoint_url'       => $endpointUrl,
            'format'             => 'JSON',
            'required_scope'     => $topicDef['required_scope'] ?? null,
            'supported'          => $topicDef['supported'] ?? true,
            'unsupported_reason' => $topicDef['unsupported_reason'] ?? null,
            'status'             => 'failed',
            'last_error'         => $errorMessage,
        ]);
        $row->save();
    }

    // ── Sync ─────────────────────────────────────────────────────────────────

    /**
     * Sync all Shopify webhook subscriptions for this shop with the local DB.
     *
     * Returns a summary array with counts:
     *   total_from_shopify, created, updated, missing, skipped, failed, errors
     *
     * @throws RuntimeException When the Shopify API call itself fails entirely.
     */
    public function sync(User $user): array
    {
        $endpointUrl = $this->buildEndpointUrl();

        $summary = [
            'total_from_shopify' => 0,
            'created'            => 0,
            'updated'            => 0,
            'missing'            => 0,
            'skipped'            => 0,
            'failed'             => 0,
            'errors'             => [],
        ];

        // Step 1 — Fetch every webhook subscription from Shopify (paginated).
        $allShopifyNodes = $this->fetchAllShopifySubscriptions($user);

        // Step 2 — Keep only nodes that point at this app's endpoint.
        $appNodes = array_values(array_filter(
            $allShopifyNodes,
            fn ($node) => rtrim($node['callbackUrl'] ?? '', '/') === rtrim($endpointUrl, '/')
        ));

        $summary['total_from_shopify'] = count($appNodes);

        // Build a map: topic_enum => shopify node (one subscription per topic expected).
        $shopifyByTopic = [];
        foreach ($appNodes as $node) {
            $shopifyByTopic[$node['topic']] = $node;
        }

        // Step 3 — Process each Shopify subscription.
        foreach ($shopifyByTopic as $topicEnum => $node) {
            try {
                $topicDef = WebhookTopicRegistry::findByEnum($topicEnum);

                if ($topicDef === null) {
                    // Topic is not in our registry — skip it.
                    $summary['skipped']++;
                    continue;
                }

                // Find any existing local row for this user + topic, regardless of status.
                $localRow = WebhookSubscription::where('user_id', $user->id)
                    ->where('topic_enum', $topicEnum)
                    ->first();

                $isNew = $localRow === null;

                if ($isNew) {
                    $localRow = new WebhookSubscription();
                }

                $localRow->fill([
                    'user_id'                 => $user->id,
                    'shop_domain'             => $user->getDomain()->toNative(),
                    'shopify_subscription_id' => $node['id'],
                    'group'                   => $topicDef['group'],
                    'action'                  => $topicDef['action'],
                    'title'                   => $topicDef['title'],
                    'topic_enum'              => $topicDef['topic_enum'],
                    'topic_header'            => $topicDef['topic_header'],
                    'endpoint_url'            => $node['callbackUrl'],
                    'format'                  => $node['format'] ?? 'JSON',
                    'filter'                  => $node['filter'] ?? null,
                    'include_fields'          => !empty($node['includeFields']) ? $node['includeFields'] : null,
                    'metafield_namespaces'    => !empty($node['metafieldNamespaces']) ? $node['metafieldNamespaces'] : null,
                    'required_scope'          => $topicDef['required_scope'] ?? null,
                    'supported'               => $topicDef['supported'] ?? true,
                    'unsupported_reason'      => $topicDef['unsupported_reason'] ?? null,
                    'status'                  => 'active',
                    'last_synced_at'          => now(),
                    'last_error'              => null,
                ]);
                $localRow->save();

                if ($isNew) {
                    $summary['created']++;
                } else {
                    $summary['updated']++;
                }
            } catch (\Throwable $e) {
                $summary['failed']++;
                $summary['errors'][] = "Topic {$topicEnum}: " . $e->getMessage();
                \Illuminate\Support\Facades\Log::error('Webhook sync failed for topic', [
                    'topic' => $topicEnum,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Step 4 — Mark local active rows not found on Shopify as missing.
        $activeLocal = WebhookSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->get();

        foreach ($activeLocal as $localSub) {
            if (!isset($shopifyByTopic[$localSub->topic_enum])) {
                $localSub->status         = 'missing_on_shopify';
                $localSub->last_synced_at = now();
                $localSub->last_error     = 'This subscription exists locally but was not found on Shopify during sync.';
                $localSub->save();
                $summary['missing']++;
            }
        }

        return $summary;
    }

    /**
     * Fetch every webhook subscription from the Shopify API, following pagination.
     *
     * Returns a flat array of raw node arrays (plain PHP, not ResponseAccess).
     *
     * @throws RuntimeException On HTTP or GraphQL-level failure.
     */
    private function fetchAllShopifySubscriptions(User $user): array
    {
        $allNodes = [];
        $after    = null;
        $pageSize = 50;

        do {
            $variables = ['first' => $pageSize];
            if ($after !== null) {
                $variables['after'] = $after;
            }

            $result = $user->api()->graph(self::QUERY_ALL, $variables);

            if ($result['errors'] === true) {
                $status = $result['status'] ?? 'unknown';
                throw new RuntimeException(
                    "Shopify API request failed (HTTP {$status}) while listing subscriptions."
                );
            }

            if ($result['errors'] !== false && !empty($result['errors'])) {
                $errorsRaw = $result['errors'];
                $messages  = is_array($errorsRaw)
                    ? array_map(
                        fn ($e) => is_array($e) ? ($e['message'] ?? json_encode($e)) : (string) $e,
                        $errorsRaw
                    )
                    : [(string) $errorsRaw];
                throw new RuntimeException('Shopify GraphQL error: ' . implode(' | ', $messages));
            }

            $bodyArray = $result['body']->container ?? [];
            $conn      = $bodyArray['data']['webhookSubscriptions'] ?? [];
            $edges     = $conn['edges'] ?? [];
            $pageInfo  = $conn['pageInfo'] ?? [];

            foreach ($edges as $edge) {
                $node = $edge['node'] ?? [];
                if (!empty($node)) {
                    $allNodes[] = $node;
                }
            }

            $hasNextPage = (bool) ($pageInfo['hasNextPage'] ?? false);
            $after       = $pageInfo['endCursor'] ?? null;

        } while ($hasNextPage && $after !== null);

        return $allNodes;
    }
}
