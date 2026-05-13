<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhook_subscriptions', function (Blueprint $table) {
            $table->id();

            // Shop identity
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('shop_domain')->nullable();

            // Shopify-side reference
            $table->string('shopify_subscription_id')->nullable();

            // Topic classification
            $table->string('group')->nullable();
            $table->string('action')->nullable();
            $table->string('title')->nullable();
            $table->string('topic_enum');
            $table->string('topic_header');

            // Delivery config
            $table->string('endpoint_url')->nullable();
            $table->string('format')->default('JSON');
            $table->text('filter')->nullable();
            $table->json('include_fields')->nullable();
            $table->json('metafield_namespaces')->nullable();

            // Registry metadata
            $table->string('required_scope')->nullable();
            $table->boolean('supported')->default(true);
            $table->text('unsupported_reason')->nullable();

            // State
            $table->string('status')->default('inactive');
            $table->timestamp('last_synced_at')->nullable();
            $table->longText('last_error')->nullable();

            $table->timestamps();

            // Indexes
            $table->index(['user_id', 'topic_enum']);
            $table->index(['shop_domain', 'topic_enum']);
            $table->index('shopify_subscription_id');
            $table->index('status');
            $table->index(['group', 'action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_subscriptions');
    }
};
