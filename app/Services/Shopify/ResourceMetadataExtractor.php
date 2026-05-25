<?php

namespace App\Services\Shopify;

class ResourceMetadataExtractor
{
    /**
     * Extract resource metadata from a webhook topic and its decoded payload.
     *
     * @return array{resource_type: string|null, resource_id: string|null, resource_gid: string|null, resource_name: string|null, resource_identifier: string|null}
     */
    public static function extract(string $topic, array $payload): array
    {
        $empty = [
            'resource_type'       => null,
            'resource_id'         => null,
            'resource_gid'        => null,
            'resource_name'       => null,
            'resource_identifier' => null,
        ];

        if (str_starts_with($topic, 'products/')) {
            return [
                'resource_type'       => 'product',
                'resource_id'         => isset($payload['id']) ? (string) $payload['id'] : null,
                'resource_gid'        => $payload['admin_graphql_api_id'] ?? null,
                'resource_name'       => $payload['title'] ?? null,
                'resource_identifier' => $payload['handle'] ?? null,
            ];
        }

        if (str_starts_with($topic, 'orders/')) {
            return [
                'resource_type'       => 'order',
                'resource_id'         => isset($payload['id']) ? (string) $payload['id'] : null,
                'resource_gid'        => $payload['admin_graphql_api_id'] ?? null,
                'resource_name'       => $payload['name'] ?? null,
                'resource_identifier' => isset($payload['order_number'])
                    ? (string) $payload['order_number']
                    : ($payload['name'] ?? null),
            ];
        }

        if (str_starts_with($topic, 'customers/')) {
            // Build a display name from first + last name, or fall back to email.
            $firstName  = trim($payload['first_name'] ?? '');
            $lastName   = trim($payload['last_name']  ?? '');
            $fullName   = trim("$firstName $lastName");
            $email      = $payload['email'] ?? null;

            return [
                'resource_type'       => 'customer',
                'resource_id'         => isset($payload['id']) ? (string) $payload['id'] : null,
                'resource_gid'        => $payload['admin_graphql_api_id'] ?? null,
                'resource_name'       => $fullName !== '' ? $fullName : ($email ?? null),
                'resource_identifier' => $email ?? (isset($payload['id']) ? (string) $payload['id'] : null),
            ];
        }

        if (str_starts_with($topic, 'inventory_items/')) {
            $id  = isset($payload['id']) ? (string) $payload['id'] : null;
            $sku = isset($payload['sku']) && $payload['sku'] !== '' ? (string) $payload['sku'] : null;

            return [
                'resource_type'       => 'inventory_item',
                'resource_id'         => $id,
                'resource_gid'        => $payload['admin_graphql_api_id'] ?? null,
                'resource_name'       => $sku ?? ($id !== null ? "Inventory Item {$id}" : null),
                'resource_identifier' => $sku ?? $id,
            ];
        }

        if (str_starts_with($topic, 'collections/')) {
            $id     = isset($payload['id']) ? (string) $payload['id'] : null;
            $title  = isset($payload['title']) && $payload['title'] !== '' ? (string) $payload['title'] : null;
            $handle = isset($payload['handle']) && $payload['handle'] !== '' ? (string) $payload['handle'] : null;

            return [
                'resource_type'       => 'collection',
                'resource_id'         => $id,
                'resource_gid'        => $payload['admin_graphql_api_id'] ?? null,
                'resource_name'       => $title ?? ($id !== null ? "Collection {$id}" : null),
                'resource_identifier' => $handle ?? $id,
            ];
        }

        if (str_starts_with($topic, 'fulfillments/')) {
            $id             = isset($payload['id']) ? (string) $payload['id'] : null;
            $trackingNumber = null;

            if (isset($payload['tracking_number']) && $payload['tracking_number'] !== '') {
                $trackingNumber = (string) $payload['tracking_number'];
            } elseif (!empty($payload['tracking_numbers']) && is_array($payload['tracking_numbers'])) {
                $first = reset($payload['tracking_numbers']);
                if ($first !== false && $first !== '') {
                    $trackingNumber = (string) $first;
                }
            }

            $orderId = isset($payload['order_id']) ? (string) $payload['order_id'] : null;

            return [
                'resource_type'       => 'fulfillment',
                'resource_id'         => $id,
                'resource_gid'        => $payload['admin_graphql_api_id'] ?? null,
                'resource_name'       => $trackingNumber ?? ($id !== null ? "Fulfillment {$id}" : null),
                'resource_identifier' => $orderId ?? $id,
            ];
        }

        if (str_starts_with($topic, 'checkouts/')) {
            $id        = isset($payload['id'])         ? (string) $payload['id']         : null;
            $email     = isset($payload['email'])      && $payload['email']      !== '' ? (string) $payload['email']      : null;
            $name      = isset($payload['name'])       && $payload['name']       !== '' ? (string) $payload['name']       : null;
            $token     = isset($payload['token'])      && $payload['token']      !== '' ? (string) $payload['token']      : null;
            $cartToken = isset($payload['cart_token']) && $payload['cart_token'] !== '' ? (string) $payload['cart_token'] : null;

            return [
                'resource_type'       => 'checkout',
                'resource_id'         => $id,
                'resource_gid'        => $payload['admin_graphql_api_id'] ?? null,
                'resource_name'       => $name ?? $email ?? ($id !== null ? "Checkout {$id}" : null),
                'resource_identifier' => $token ?? $cartToken ?? $id,
            ];
        }

        if (str_starts_with($topic, 'metaobjects/')) {
            $id          = isset($payload['id'])           ? (string) $payload['id']          : null;
            $type        = isset($payload['type'])         && $payload['type']        !== '' ? (string) $payload['type']        : null;
            $handle      = isset($payload['handle'])       && $payload['handle']      !== '' ? (string) $payload['handle']      : null;
            $displayName = isset($payload['display_name']) && $payload['display_name'] !== '' ? (string) $payload['display_name'] : null;

            // resource_name: handle > display_name > "Metaobject {id}"
            $name = $handle ?? $displayName ?? ($id !== null ? "Metaobject {$id}" : null);

            // resource_identifier: "type:handle" > handle > id
            $identifier = ($type !== null && $handle !== null)
                ? "{$type}:{$handle}"
                : ($handle ?? $id);

            return [
                'resource_type'       => 'metaobject',
                'resource_id'         => $id,
                'resource_gid'        => $payload['admin_graphql_api_id'] ?? null,
                'resource_name'       => $name,
                'resource_identifier' => $identifier,
            ];
        }

        return $empty;
    }
}
