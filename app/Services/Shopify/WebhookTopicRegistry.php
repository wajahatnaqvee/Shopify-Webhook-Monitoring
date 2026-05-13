<?php

namespace App\Services\Shopify;

class WebhookTopicRegistry
{
    /**
     * All defined webhook topics for this application.
     * Each entry is the canonical definition for a single Shopify webhook topic.
     *
     * Later chunks will add: Metafields, Customers, Inventory, MetaObjects,
     * Checkout, Collections, and Fulfillment groups.
     */
    protected static array $topics = [

        // ── Products ─────────────────────────────────────────────────────────

        [
            'group'              => 'Products',
            'action'             => 'create',
            'title'              => 'Product Created',
            'topic_enum'         => 'PRODUCTS_CREATE',
            'topic_header'       => 'products/create',
            'required_scope'     => 'read_products',
            'description'        => 'Fires when a new product is created in the Shopify store.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        [
            'group'              => 'Products',
            'action'             => 'update',
            'title'              => 'Product Updated',
            'topic_enum'         => 'PRODUCTS_UPDATE',
            'topic_header'       => 'products/update',
            'required_scope'     => 'read_products',
            'description'        => 'Fires when an existing product is updated in the Shopify store.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        [
            'group'              => 'Products',
            'action'             => 'delete',
            'title'              => 'Product Deleted',
            'topic_enum'         => 'PRODUCTS_DELETE',
            'topic_header'       => 'products/delete',
            'required_scope'     => 'read_products',
            'description'        => 'Fires when a product is permanently deleted from the Shopify store.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        // ── Orders ───────────────────────────────────────────────────────────

        [
            'group'              => 'Orders',
            'action'             => 'create',
            'title'              => 'Order Created',
            'topic_enum'         => 'ORDERS_CREATE',
            'topic_header'       => 'orders/create',
            'required_scope'     => 'read_orders',
            'description'        => 'Fires when a new order is placed in the Shopify store.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        [
            'group'              => 'Orders',
            'action'             => 'update',
            'title'              => 'Order Updated',
            'topic_enum'         => 'ORDERS_UPDATED',
            'topic_header'       => 'orders/updated',
            'required_scope'     => 'read_orders',
            'description'        => 'Fires when an existing order is updated in the Shopify store.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        [
            'group'              => 'Orders',
            'action'             => 'delete',
            'title'              => 'Order Deleted',
            'topic_enum'         => 'ORDERS_DELETE',
            'topic_header'       => 'orders/delete',
            'required_scope'     => 'read_orders',
            'description'        => 'Fires when an order is deleted from the Shopify store (e.g. test orders).',
            'default_enabled'    => false,
            'supported'          => true,   // ORDERS_DELETE is valid in current Shopify API versions.
            'unsupported_reason' => null,
        ],


    ];

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Return all defined topics.
     */
    public static function all(): array
    {
        return static::$topics;
    }

    /**
     * Return the unique list of group names.
     */
    public static function groups(): array
    {
        return array_values(
            array_unique(array_column(static::$topics, 'group'))
        );
    }

    /**
     * Return all topics that belong to a specific group.
     */
    public static function byGroup(string $group): array
    {
        return array_values(
            array_filter(static::$topics, fn($t) => strcasecmp($t['group'], $group) === 0)
        );
    }

    /**
     * Return all topics that match a specific action (create, update, delete …).
     */
    public static function byAction(string $action): array
    {
        return array_values(
            array_filter(static::$topics, fn($t) => strcasecmp($t['action'], $action) === 0)
        );
    }

    /**
     * Find a single topic definition by its Shopify GraphQL enum value.
     */
    public static function findByEnum(string $topicEnum): ?array
    {
        foreach (static::$topics as $topic) {
            if (strcasecmp($topic['topic_enum'], $topicEnum) === 0) {
                return $topic;
            }
        }
        return null;
    }

    /**
     * Find a single topic definition by its HTTP header value (e.g. "products/create").
     */
    public static function findByHeader(string $topicHeader): ?array
    {
        foreach (static::$topics as $topic) {
            if (strcasecmp($topic['topic_header'], $topicHeader) === 0) {
                return $topic;
            }
        }
        return null;
    }

    /**
     * Return only topics that are marked as supported.
     */
    public static function supportedOnly(): array
    {
        return array_values(
            array_filter(static::$topics, fn($t) => $t['supported'] === true)
        );
    }

    /**
     * Return only topics that are marked as unsupported.
     */
    public static function unsupportedOnly(): array
    {
        return array_values(
            array_filter(static::$topics, fn($t) => $t['supported'] === false)
        );
    }

    /**
     * Return topics that are recommended for registration by default.
     * These are supported topics with default_enabled = true.
     */
    public function recommended(): array
    {
        return collect($this->all())
            ->filter(fn(array $topic) => ($topic['recommended'] ?? false) === true)
            ->values()
            ->all();
    }
    public function systemRequired(): array
{
    return collect($this->all())
        ->filter(fn (array $topic) => ($topic['system_required'] ?? false) === true)
        ->values()
        ->all();
}
}
