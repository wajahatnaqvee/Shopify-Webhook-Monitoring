<?php

namespace App\Services\Shopify;

use App\Models\WebhookEvent;

class WebhookEventProcessor
{
    public function process(WebhookEvent $event): void
    {
        match ($event->topic) {
            'products/create' => $this->handleProductCreate($event),
            'products/update' => $this->handleProductUpdate($event),
            'products/delete' => $this->handleProductDelete($event),

            'orders/create' => $this->handleOrderCreate($event),
            'orders/updated' => $this->handleOrderUpdate($event),
            'orders/delete' => $this->handleOrderDelete($event),

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

    private function handleUnknownTopic(WebhookEvent $event): void
    {
        $event->update([
            'status' => 'ignored',
            'error_message' => 'No processor found for topic: ' . $event->topic,
        ]);
    }
}