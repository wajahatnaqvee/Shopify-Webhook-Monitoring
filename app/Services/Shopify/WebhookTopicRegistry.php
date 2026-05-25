<?php

namespace App\Services\Shopify;

class WebhookTopicRegistry
{
    /**
     * All defined webhook topics for this application.
     * Each entry is the canonical definition for a single Shopify webhook topic.
     *
     * Later chunks will add: Metafields, MetaObjects,
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

        // ── Customers ────────────────────────────────────────────────────────

        [
            'group'              => 'Customers',
            'action'             => 'create',
            'title'              => 'Customer Created',
            'topic_enum'         => 'CUSTOMERS_CREATE',
            'topic_header'       => 'customers/create',
            'required_scope'     => 'read_customers',
            'description'        => 'Fires when a new customer account is created in the Shopify store.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        [
            'group'              => 'Customers',
            'action'             => 'update',
            'title'              => 'Customer Updated',
            'topic_enum'         => 'CUSTOMERS_UPDATE',
            'topic_header'       => 'customers/update',
            'required_scope'     => 'read_customers',
            'description'        => 'Fires when a customer account is updated in the Shopify store.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        [
            'group'              => 'Customers',
            'action'             => 'delete',
            'title'              => 'Customer Deleted',
            'topic_enum'         => 'CUSTOMERS_DELETE',
            'topic_header'       => 'customers/delete',
            'required_scope'     => 'read_customers',
            'description'        => 'Fires when a customer account is deleted from the Shopify store.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        // ── Inventory Items ───────────────────────────────────────────────────

        [
            'group'              => 'Inventory',
            'action'             => 'create',
            'title'              => 'Inventory Item Created',
            'topic_enum'         => 'INVENTORY_ITEMS_CREATE',
            'topic_header'       => 'inventory_items/create',
            'required_scope'     => 'read_inventory',
            'description'        => 'Fires when an inventory item is created.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        [
            'group'              => 'Inventory',
            'action'             => 'update',
            'title'              => 'Inventory Item Updated',
            'topic_enum'         => 'INVENTORY_ITEMS_UPDATE',
            'topic_header'       => 'inventory_items/update',
            'required_scope'     => 'read_inventory',
            'description'        => 'Fires when an inventory item is updated.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        [
            'group'              => 'Inventory',
            'action'             => 'delete',
            'title'              => 'Inventory Item Deleted',
            'topic_enum'         => 'INVENTORY_ITEMS_DELETE',
            'topic_header'       => 'inventory_items/delete',
            'required_scope'     => 'read_inventory',
            'description'        => 'Fires when an inventory item is deleted.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        // ── Collections ───────────────────────────────────────────────────────

        [
            'group'              => 'Collections',
            'action'             => 'create',
            'title'              => 'Collection Created',
            'topic_enum'         => 'COLLECTIONS_CREATE',
            'topic_header'       => 'collections/create',
            'required_scope'     => 'read_products',
            'description'        => 'Fires when a collection is created.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        [
            'group'              => 'Collections',
            'action'             => 'update',
            'title'              => 'Collection Updated',
            'topic_enum'         => 'COLLECTIONS_UPDATE',
            'topic_header'       => 'collections/update',
            'required_scope'     => 'read_products',
            'description'        => 'Fires when a collection is updated.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        [
            'group'              => 'Collections',
            'action'             => 'delete',
            'title'              => 'Collection Deleted',
            'topic_enum'         => 'COLLECTIONS_DELETE',
            'topic_header'       => 'collections/delete',
            'required_scope'     => 'read_products',
            'description'        => 'Fires when a collection is deleted.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],
        // ── Fulfillment ───────────────────────────────────────────────────────────
        // Note: 'fulfillments/create' and 'fulfillments/update' are NOT valid Shopify
        // webhook topics. The correct topics are 'orders/fulfilled' and
        // 'orders/partially_fulfilled', registered here under the Fulfillment group
        // so they appear in the Fulfillment dashboard tab.

        [
            'group'              => 'Fulfillment',
            'action'             => 'fulfilled',
            'title'              => 'Order Fulfilled',
            'topic_enum'         => 'ORDERS_FULFILLED',
            'topic_header'       => 'orders/fulfilled',
            'required_scope'     => 'read_orders',
            'description'        => 'Fires when an order is fully fulfilled.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        [
            'group'              => 'Fulfillment',
            'action'             => 'partially_fulfilled',
            'title'              => 'Order Partially Fulfilled',
            'topic_enum'         => 'ORDERS_PARTIALLY_FULFILLED',
            'topic_header'       => 'orders/partially_fulfilled',
            'required_scope'     => 'read_orders',
            'description'        => 'Fires when an order is partially fulfilled.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        [
            'group'              => 'Fulfillment',
            'action'             => 'create',
            'title'              => 'Fulfillment Created',
            'topic_enum'         => 'FULFILLMENTS_CREATE',
            'topic_header'       => 'fulfillments/create',
            'required_scope'     => 'read_fulfillments',
            'description'        => 'Fires when a fulfillment is created.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        [
            'group'              => 'Fulfillment',
            'action'             => 'update',
            'title'              => 'Fulfillment Updated',
            'topic_enum'         => 'FULFILLMENTS_UPDATE',
            'topic_header'       => 'fulfillments/update',
            'required_scope'     => 'read_fulfillments',
            'description'        => 'Fires when a fulfillment is updated.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        // ── Checkout ─────────────────────────────────────────────────────────────
        // Note: Checkout webhooks may require the storefront to be enabled and
        // may behave differently across checkout types (standard, Shop Pay, etc.).

        [
            'group'              => 'Checkout',
            'action'             => 'create',
            'title'              => 'Checkout Created',
            'topic_enum'         => 'CHECKOUTS_CREATE',
            'topic_header'       => 'checkouts/create',
            'required_scope'     => 'read_orders',
            'description'        => 'Fires when a checkout is created.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        [
            'group'              => 'Checkout',
            'action'             => 'update',
            'title'              => 'Checkout Updated',
            'topic_enum'         => 'CHECKOUTS_UPDATE',
            'topic_header'       => 'checkouts/update',
            'required_scope'     => 'read_orders',
            'description'        => 'Fires when a checkout is updated.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],

        [
            'group'              => 'Checkout',
            'action'             => 'delete',
            'title'              => 'Checkout Deleted',
            'topic_enum'         => 'CHECKOUTS_DELETE',
            'topic_header'       => 'checkouts/delete',
            'required_scope'     => 'read_orders',
            'description'        => 'Fires when a checkout is deleted.',
            'default_enabled'    => true,
            'supported'          => true,
            'unsupported_reason' => null,
        ],
        // ── Metaobjects ───────────────────────────────────────────────────────
        // Shopify REQUIRES a metaobject type handle as a filter when registering
        // these webhooks. Use the dedicated Metaobjects registration UI which
        // fetches available types and passes filter: "type:{handle}" automatically.

        [
            'group'           => 'Metaobjects',
            'action'          => 'create',
            'title'           => 'Metaobject Created',
            'topic_enum'      => 'METAOBJECTS_CREATE',
            'topic_header'    => 'metaobjects/create',
            'required_scope'  => 'read_metaobjects',
            'description'     => 'Fires when a metaobject of the selected type is created.',
            'default_enabled' => false,
            'supported'       => true,
            'unsupported_reason' => null,
            'requires_filter' => true,
            'filter_type'     => 'metaobject_type',
        ],

        [
            'group'           => 'Metaobjects',
            'action'          => 'update',
            'title'           => 'Metaobject Updated',
            'topic_enum'      => 'METAOBJECTS_UPDATE',
            'topic_header'    => 'metaobjects/update',
            'required_scope'  => 'read_metaobjects',
            'description'     => 'Fires when a metaobject of the selected type is updated.',
            'default_enabled' => false,
            'supported'       => true,
            'unsupported_reason' => null,
            'requires_filter' => true,
            'filter_type'     => 'metaobject_type',
        ],

        [
            'group'           => 'Metaobjects',
            'action'          => 'delete',
            'title'           => 'Metaobject Deleted',
            'topic_enum'      => 'METAOBJECTS_DELETE',
            'topic_header'    => 'metaobjects/delete',
            'required_scope'  => 'read_metaobjects',
            'description'     => 'Fires when a metaobject of the selected type is deleted.',
            'default_enabled' => false,
            'supported'       => true,
            'unsupported_reason' => null,
            'requires_filter' => true,
            'filter_type'     => 'metaobject_type',
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
            ->filter(fn(array $topic) => ($topic['default_enabled'] ?? false) === true)
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
