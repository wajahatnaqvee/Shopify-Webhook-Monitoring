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
                callbackUrl
                format
                filter
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
     * Topics that Shopify GraphQL does not support for webhook subscription.
     * These fall back to the REST Admin API automatically.
     */
    private const REST_FALLBACK_TOPICS = [
        'checkouts/create',
        'checkouts/update',
        'checkouts/delete',
    ];

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
    /**
     * @param  array  $overrides  Optional overrides: 'filter' (string), 'metaobject_type' (string)
     */
    public function register(array $topicDef, User $user, array $overrides = []): WebhookSubscription
    {
        // Use a topic-specific endpoint path if defined (e.g. app/uninstalled),
        // otherwise fall back to the general /webhooks/shopify monitor endpoint.
        $endpointUrl = isset($topicDef['endpoint_path'])
            ? rtrim(config('app.url'), '/') . $topicDef['endpoint_path']
            : $this->buildEndpointUrl();

        $this->validateEndpointUrl($endpointUrl);

        // Determine the filter value: explicit override first, then legacy sub_topic fallback.
        $filterValue = $overrides['filter'] ?? (!empty($topicDef['sub_topic']) ? (string) $topicDef['sub_topic'] : null);
        $metaobjectType = $overrides['metaobject_type'] ?? null;

        // Prevent duplicate active subscription for the same shop + topic + endpoint + filter.
        $duplicateQuery = WebhookSubscription::where('user_id', $user->id)
            ->where('topic_enum', $topicDef['topic_enum'])
            ->where('endpoint_url', $endpointUrl)
            ->where('status', 'active');

        if ($filterValue !== null) {
            $duplicateQuery->where('filter', $filterValue);
        } else {
            $duplicateQuery->whereNull('filter');
        }

        $existing = $duplicateQuery->first();

        if ($existing) {
            return $existing;
        }

        // Find or initialise a local row so we can save error state if the call fails.
        // For filter-based topics (e.g. metaobjects), scope the row by filter too so
        // each type gets its own row rather than overwriting a shared row.
        $localRowKey = ['user_id' => $user->id, 'topic_enum' => $topicDef['topic_enum']];
        if ($filterValue !== null) {
            $localRowKey['filter'] = $filterValue;
        }
        $localRow = WebhookSubscription::firstOrNew($localRowKey);

        $variables = [
            'topic'               => $topicDef['topic_enum'],
            'webhookSubscription' => [
                'callbackUrl' => $endpointUrl,
                'format'      => 'JSON',
            ],
        ];

        // Pass filter to Shopify when present (required for metaobject webhooks).
        if ($filterValue !== null) {
            $variables['webhookSubscription']['filter'] = $filterValue;
        }

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
                // field can be an array path like ["webhookSubscription","uri"]
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

            // Shopify GraphQL rejects certain topics (e.g. fulfillments/*, checkouts/*).
            // Fall back to the REST Admin API for these topics.
            if (
                stripos($joined, 'cannot create a webhook subscription with the specified topic') !== false
                && in_array($topicDef['topic_header'], self::REST_FALLBACK_TOPICS, true)
            ) {
                return $this->registerViaRest($localRow, $topicDef, $user, $endpointUrl);
            }

            // Fulfillment webhooks require the read_fulfillments scope.
            // Give an actionable message so the developer knows exactly what to do.
            if (str_starts_with($topicDef['topic_header'], 'fulfillments/')) {
                $scopeMsg = 'Fulfillment webhooks require the read_fulfillments scope. '
                    . 'Add "read_fulfillments" to SHOPIFY_API_SCOPES in your .env file and reinstall/re-authenticate the app. '
                    . '(Shopify error: ' . ($joined ?: 'unknown') . ')';
                $this->markFailed($localRow, $topicDef, $user, $endpointUrl, $scopeMsg);
                throw new RuntimeException($scopeMsg);
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
            'filter'                   => $filterValue,
            'metaobject_type'          => $metaobjectType,
            'registration_method'      => 'graphql',
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

        // Route REST-registered subscriptions to the REST delete path.
        if ($subscription->registration_method === 'rest') {
            $this->deleteViaRest($user, $subscription);
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
            'registration_method'     => 'graphql',
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

        // Step 1a — Fetch GraphQL webhook subscriptions (paginated).
        $graphqlNodes = $this->fetchAllShopifySubscriptions($user);

        // Step 1b — Fetch REST webhooks for topics that only register via REST.
        $restNodes = $this->fetchRestWebhooks($user, $endpointUrl);

        // Step 2 — Filter GraphQL nodes to our endpoint; tag each with 'graphql'.
        $graphqlAppNodes = array_values(array_filter(
            $graphqlNodes,
            fn ($node) => rtrim($node['callbackUrl'] ?? '', '/') === rtrim($endpointUrl, '/')
        ));

        // Merge both sources. REST nodes are already filtered to our endpoint and tagged 'rest'.
        $allNodes = array_merge(
            array_map(fn ($n) => array_merge($n, ['registration_method' => 'graphql']), $graphqlAppNodes),
            $restNodes
        );

        $summary['total_from_shopify'] = count($allNodes);

        // Build a map keyed by topic+filter so multiple subscriptions per topic
        // (e.g. different metaobject type filters) are each handled independently.
        $shopifyByKey = [];
        foreach ($allNodes as $node) {
            $key = $node['topic'] . '||' . ($node['filter'] ?? '');
            if (!isset($shopifyByKey[$key])) {
                $shopifyByKey[$key] = $node;
            }
        }

        // Step 3 — Process each Shopify subscription.
        foreach ($shopifyByKey as $key => $node) {
            $topicEnum = $node['topic'];
            $filterVal = $node['filter'] ?? null;
            $regMethod = $node['registration_method'] ?? 'graphql';

            try {
                $topicDef = WebhookTopicRegistry::findByEnum($topicEnum);

                if ($topicDef === null) {
                    // Topic is not in our registry — skip it.
                    $summary['skipped']++;
                    continue;
                }

                // Match by topic + filter so each metaobject type gets its own row.
                $query = WebhookSubscription::where('user_id', $user->id)
                    ->where('topic_enum', $topicEnum);

                if ($filterVal !== null) {
                    $query->where('filter', $filterVal);
                } else {
                    $query->whereNull('filter');
                }

                $localRow = $query->first();
                $isNew    = $localRow === null;

                if ($isNew) {
                    $localRow = new WebhookSubscription();
                }

                // Derive metaobject_type from the filter string when applicable.
                $metaobjectType = null;
                if ($filterVal && str_starts_with($filterVal, 'type:')) {
                    $metaobjectType = substr($filterVal, 5);
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
                    'filter'                  => $filterVal,
                    'metaobject_type'         => $metaobjectType,
                    'include_fields'          => !empty($node['includeFields']) ? $node['includeFields'] : null,
                    'metafield_namespaces'    => !empty($node['metafieldNamespaces']) ? $node['metafieldNamespaces'] : null,
                    'required_scope'          => $topicDef['required_scope'] ?? null,
                    'supported'               => $topicDef['supported'] ?? true,
                    'unsupported_reason'      => $topicDef['unsupported_reason'] ?? null,
                    'registration_method'     => $regMethod,
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
                $summary['errors'][] = "Topic {$topicEnum} (filter: {$filterVal}): " . $e->getMessage();
                \Illuminate\Support\Facades\Log::error('Webhook sync failed for topic', [
                    'topic'  => $topicEnum,
                    'filter' => $filterVal,
                    'error'  => $e->getMessage(),
                ]);
            }
        }

        // Step 4 — Mark local active rows not found on Shopify as missing.
        // Use the same topic+filter key for matching.
        $activeLocal = WebhookSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->get();

        foreach ($activeLocal as $localSub) {
            $localKey = $localSub->topic_enum . '||' . ($localSub->filter ?? '');
            if (!isset($shopifyByKey[$localKey])) {
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

    // ── REST fallback helpers ─────────────────────────────────────────────────

    /**
     * Return the configured Shopify API version string.
     */
    private function getApiVersion(): string
    {
        return config('shopify-app.api_version', '2025-01');
    }

    /**
     * Register a webhook via the REST Admin API.
     * Called when GraphQL rejects the topic (fulfillments/*, checkouts/*).
     */
    private function registerViaRest(
        WebhookSubscription $localRow,
        array $topicDef,
        User $user,
        string $endpointUrl
    ): WebhookSubscription {
        $version = $this->getApiVersion();
        Log::info('Trying REST fallback registration', [
            'topic' => $topicDef['topic_header'],
            'shop'  => $user->name ?? null,
        ]);

        try {
            $result = $user->api()->rest('POST', "/admin/api/{$version}/webhooks.json", [
                'webhook' => [
                    'topic'   => $topicDef['topic_header'],
                    'address' => $endpointUrl,
                    'format'  => 'json',
                ],
            ]);
        } catch (\Throwable $e) {
            $msg = 'REST fallback registration failed: ' . $e->getMessage();
            $this->markFailed($localRow, $topicDef, $user, $endpointUrl, $msg);
            throw new RuntimeException($msg, 0, $e);
        }

        // HTTP-level failure — $result['body'] is the raw error value (not ResponseAccess).
        if ($result['errors'] === true) {
            $statusCode = $result['status'] ?? 0;
            $errBody    = $result['body'];

            if ($errBody !== null) {
                $errStr = is_array($errBody) ? json_encode($errBody) : (string) $errBody;
                if (stripos($errStr, 'already been taken') !== false) {
                    return $this->importExistingFromShopifyViaRest($localRow, $topicDef, $user, $endpointUrl);
                }
                $this->markFailed($localRow, $topicDef, $user, $endpointUrl, 'REST: ' . $errStr);
                throw new RuntimeException('REST webhook registration failed: ' . $errStr);
            }

            $msg = "REST API request failed (HTTP {$statusCode}).";
            $this->markFailed($localRow, $topicDef, $user, $endpointUrl, $msg);
            throw new RuntimeException($msg);
        }

        // Success — $result['body'] is a ResponseAccess; access decoded array via ->container.
        $bodyArray   = $result['body']->container ?? [];
        $webhookData = $bodyArray['webhook'] ?? [];

        if (empty($webhookData)) {
            $msg = 'REST API returned empty webhook data.';
            $this->markFailed($localRow, $topicDef, $user, $endpointUrl, $msg);
            throw new RuntimeException($msg);
        }

        $localRow->fill([
            'user_id'                 => $user->id,
            'shop_domain'             => $user->getDomain()->toNative(),
            'shopify_subscription_id' => (string) ($webhookData['id'] ?? ''),
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
            'registration_method'     => 'rest',
            'status'                  => 'active',
            'last_synced_at'          => now(),
            'last_error'              => null,
        ]);
        $localRow->save();

        Log::info('REST webhook registered successfully', [
            'topic'      => $topicDef['topic_header'],
            'shopify_id' => $webhookData['id'] ?? null,
        ]);

        return $localRow;
    }

    /**
     * Import an already-existing REST webhook from Shopify (address already taken).
     */
    private function importExistingFromShopifyViaRest(
        WebhookSubscription $localRow,
        array $topicDef,
        User $user,
        string $endpointUrl
    ): WebhookSubscription {
        $version = $this->getApiVersion();

        try {
            $result = $user->api()->rest('GET', "/admin/api/{$version}/webhooks.json", [
                'topic'   => $topicDef['topic_header'],
                'address' => $endpointUrl,
            ]);
        } catch (\Throwable $e) {
            $msg = 'Could not import existing REST webhook: ' . $e->getMessage();
            $this->markFailed($localRow, $topicDef, $user, $endpointUrl, $msg);
            throw new RuntimeException($msg, 0, $e);
        }

        $bodyArray = $result['body']->container ?? [];
        $webhooks  = $bodyArray['webhooks'] ?? [];

        $match = null;
        foreach ($webhooks as $wh) {
            if (rtrim($wh['address'] ?? '', '/') === rtrim($endpointUrl, '/')) {
                $match = $wh;
                break;
            }
        }

        $localRow->fill([
            'user_id'                 => $user->id,
            'shop_domain'             => $user->getDomain()->toNative(),
            'shopify_subscription_id' => $match ? (string) $match['id'] : null,
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
            'registration_method'     => 'rest',
            'status'                  => 'active',
            'last_synced_at'          => now(),
            'last_error'              => null,
        ]);
        $localRow->save();

        return $localRow;
    }

    /**
     * Delete a REST-registered webhook from Shopify.
     */
    private function deleteViaRest(User $user, WebhookSubscription $subscription): void
    {
        $version = $this->getApiVersion();
        $id      = $subscription->shopify_subscription_id;

        try {
            $result = $user->api()->rest('DELETE', "/admin/api/{$version}/webhooks/{$id}.json");
        } catch (\Throwable $e) {
            $subscription->last_error = 'REST delete failed: ' . $e->getMessage();
            $subscription->save();
            throw new RuntimeException('REST webhook deletion failed: ' . $e->getMessage(), 0, $e);
        }

        $statusCode = $result['status'] ?? 0;

        // 404 means already gone from Shopify — treat as a successful local delete.
        if ($result['errors'] === true && $statusCode === 404) {
            $subscription->status         = 'deleted';
            $subscription->last_synced_at = now();
            $subscription->last_error     = null;
            $subscription->save();
            return;
        }

        if ($result['errors'] === true) {
            $msg = "REST API request failed (HTTP {$statusCode}).";
            $subscription->last_error = $msg;
            $subscription->save();
            throw new RuntimeException($msg);
        }

        // Success (204 No Content typical for DELETE).
        $subscription->status         = 'deleted';
        $subscription->last_synced_at = now();
        $subscription->last_error     = null;
        $subscription->save();
    }

    /**
     * Fetch REST webhook subscriptions from Shopify, returning only those pointing
     * at this app's endpoint. Each node is tagged with registration_method='rest'
     * and topic_enum is resolved from the topic_header via the registry.
     *
     * Returns an empty array (never throws) so sync degrades gracefully on REST failure.
     */
    private function fetchRestWebhooks(User $user, string $endpointUrl): array
    {
        $version = $this->getApiVersion();
        $nodes   = [];

        try {
            $result = $user->api()->rest('GET', "/admin/api/{$version}/webhooks.json");
        } catch (\Throwable $e) {
            Log::warning('REST webhook list failed during sync', ['error' => $e->getMessage()]);
            return [];
        }

        if ($result['errors'] === true) {
            Log::warning('REST webhook list request failed', ['status' => $result['status'] ?? 'unknown']);
            return [];
        }

        $bodyArray = $result['body']->container ?? [];
        $webhooks  = $bodyArray['webhooks'] ?? [];

        foreach ($webhooks as $wh) {
            // Only include webhooks pointing at our endpoint.
            if (rtrim($wh['address'] ?? '', '/') !== rtrim($endpointUrl, '/')) {
                continue;
            }

            $topicHeader = $wh['topic'] ?? null;

            // Only care about topics in our REST fallback list.
            if (!in_array($topicHeader, self::REST_FALLBACK_TOPICS, true)) {
                continue;
            }

            $topicDef = WebhookTopicRegistry::findByHeader($topicHeader);
            if ($topicDef === null) {
                continue;
            }

            $nodes[] = [
                'id'                  => (string) ($wh['id'] ?? ''),
                'topic'               => $topicDef['topic_enum'],
                'callbackUrl'         => $wh['address'] ?? null,
                'filter'              => null,
                'format'              => strtoupper($wh['format'] ?? 'JSON'),
                'includeFields'       => [],
                'metafieldNamespaces' => [],
                'createdAt'           => $wh['created_at'] ?? null,
                'updatedAt'           => $wh['updated_at'] ?? null,
                'registration_method' => 'rest',
            ];
        }

        return $nodes;
    }
}
