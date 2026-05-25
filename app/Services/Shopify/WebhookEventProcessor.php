<?php

namespace App\Services\Shopify;

use App\Models\WebhookEvent;
use Illuminate\Support\Facades\Log;

class WebhookEventProcessor
{
    public function process(WebhookEvent $event): void
    {
        match ($event->topic) {
            'products/create' => $this->handleProductCreate($event),
            'products/update' => $this->handleProductUpdate($event),
            'products/delete' => $this->handleProductDelete($event),

            'orders/create'   => $this->handleOrderCreate($event),
            'orders/updated'  => $this->handleOrderUpdate($event),
            'orders/delete'   => $this->handleOrderDelete($event),

            'customers/create' => $this->handleCustomerCreate($event),
            'customers/update' => $this->handleCustomerUpdate($event),
            'customers/delete' => $this->handleCustomerDelete($event),

            'inventory_items/create' => $this->handleInventoryItemCreate($event),
            'inventory_items/update' => $this->handleInventoryItemUpdate($event),
            'inventory_items/delete' => $this->handleInventoryItemDelete($event),

            'collections/create' => $this->handleCollectionCreate($event),
            'collections/update' => $this->handleCollectionUpdate($event),
            'collections/delete' => $this->handleCollectionDelete($event),

            'metaobjects/create' => $this->handleMetaobjectCreate($event),
            'metaobjects/update' => $this->handleMetaobjectUpdate($event),
            'metaobjects/delete' => $this->handleMetaobjectDelete($event),

            'orders/fulfilled'           => $this->handleOrderFulfilled($event),
            'orders/partially_fulfilled' => $this->handleOrderPartiallyFulfilled($event),

            'fulfillments/create' => $this->handleFulfillmentCreate($event),
            'fulfillments/update' => $this->handleFulfillmentUpdate($event),

            'checkouts/create' => $this->handleCheckoutCreate($event),
            'checkouts/update' => $this->handleCheckoutUpdate($event),
            'checkouts/delete' => $this->handleCheckoutDelete($event),

            default => $this->handleUnknownTopic($event),
        };
    }

  private function handleProductCreate(WebhookEvent $event): void
{
}

    private function handleProductUpdate(WebhookEvent $event): void
    {
        // TODO later: update local product snapshot if we create one.
    }

    private function handleProductDelete(WebhookEvent $event): void
    {
        // TODO later: mark local product deleted if we create product storage.
    }

    private function handleOrderCreate(WebhookEvent $event): void
    {
        // TODO later: store/order sync logic.
    }

    private function handleOrderUpdate(WebhookEvent $event): void
    {
        // TODO later.
    }

    private function handleOrderDelete(WebhookEvent $event): void
    {
        // TODO later.
    }

    private function handleCustomerCreate(WebhookEvent $event): void
    {
        // TODO later: sync new customer to local storage.
    }

    private function handleCustomerUpdate(WebhookEvent $event): void
    {
        // TODO later: update local customer record.
    }

    private function handleCustomerDelete(WebhookEvent $event): void
    {
        // TODO later: mark local customer deleted.
    }

    private function handleInventoryItemCreate(WebhookEvent $event): void
    {
        // Inventory item created — logs and marks success via the job layer.
        Log::debug('Inventory item create webhook processed', [
            'event_id'    => $event->id,
            'resource_id' => $event->resource_id,
        ]);
    }

    private function handleInventoryItemUpdate(WebhookEvent $event): void
    {
        // Inventory item updated — logs and marks success via the job layer.
        Log::debug('Inventory item update webhook processed', [
            'event_id'    => $event->id,
            'resource_id' => $event->resource_id,
        ]);
    }

    private function handleInventoryItemDelete(WebhookEvent $event): void
    {
        // Inventory item deleted — logs and marks success via the job layer.
        Log::debug('Inventory item delete webhook processed', [
            'event_id'    => $event->id,
            'resource_id' => $event->resource_id,
        ]);
    }

    private function handleCollectionCreate(WebhookEvent $event): void
    {
        // Collection created — logged and marked success via the job layer.
        Log::debug('Collection create webhook processed', [
            'event_id'    => $event->id,
            'resource_id' => $event->resource_id,
        ]);
    }

    private function handleCollectionUpdate(WebhookEvent $event): void
    {
        // Collection updated — logged and marked success via the job layer.
        Log::debug('Collection update webhook processed', [
            'event_id'    => $event->id,
            'resource_id' => $event->resource_id,
        ]);
    }

    private function handleCollectionDelete(WebhookEvent $event): void
    {
        // Collection deleted — logged and marked success via the job layer.
        Log::debug('Collection delete webhook processed', [
            'event_id'    => $event->id,
            'resource_id' => $event->resource_id,
        ]);
    }

    private function handleMetaobjectCreate(WebhookEvent $event): void
    {
        // Metaobject created — logged and marked success via the job layer.
        Log::debug('Metaobject create webhook processed', [
            'event_id'    => $event->id,
            'resource_id' => $event->resource_id,
        ]);
    }

    private function handleMetaobjectUpdate(WebhookEvent $event): void
    {
        // Metaobject updated — logged and marked success via the job layer.
        Log::debug('Metaobject update webhook processed', [
            'event_id'    => $event->id,
            'resource_id' => $event->resource_id,
        ]);
    }

    private function handleOrderFulfilled(WebhookEvent $event): void
    {
        // Order fully fulfilled.
        Log::debug('Order fulfilled webhook processed', [
            'event_id'    => $event->id,
            'resource_id' => $event->resource_id,
        ]);
    }

    private function handleOrderPartiallyFulfilled(WebhookEvent $event): void
    {
        // Order partially fulfilled.
        Log::debug('Order partially fulfilled webhook processed', [
            'event_id'    => $event->id,
            'resource_id' => $event->resource_id,
        ]);
    }

    private function handleFulfillmentCreate(WebhookEvent $event): void
    {
        Log::debug('Fulfillment created webhook processed', [
            'event_id'    => $event->id,
            'resource_id' => $event->resource_id,
        ]);
    }

    private function handleFulfillmentUpdate(WebhookEvent $event): void
    {
        Log::debug('Fulfillment updated webhook processed', [
            'event_id'    => $event->id,
            'resource_id' => $event->resource_id,
        ]);
    }

    private function handleCheckoutCreate(WebhookEvent $event): void
    {
        // Checkout created — logged and marked success via the job layer.
        Log::debug('Checkout create webhook processed', [
            'event_id'    => $event->id,
            'resource_id' => $event->resource_id,
        ]);
    }

    private function handleCheckoutUpdate(WebhookEvent $event): void
    {
        // Checkout updated — logged and marked success via the job layer.
        Log::debug('Checkout update webhook processed', [
            'event_id'    => $event->id,
            'resource_id' => $event->resource_id,
        ]);
    }

    private function handleCheckoutDelete(WebhookEvent $event): void
    {
        // Checkout deleted — logged and marked success via the job layer.
        Log::debug('Checkout delete webhook processed', [
            'event_id'    => $event->id,
            'resource_id' => $event->resource_id,
        ]);
    }

    private function handleMetaobjectDelete(WebhookEvent $event): void
    {
        // Metaobject deleted — logged and marked success via the job layer.
        Log::debug('Metaobject delete webhook processed', [
            'event_id'    => $event->id,
            'resource_id' => $event->resource_id,
        ]);
    }

    private function handleUnknownTopic(WebhookEvent $event): void
    {
        $event->update([
            'status' => 'ignored',
            'error_message' => 'No processor found for topic: ' . $event->topic,
        ]);
    }
}