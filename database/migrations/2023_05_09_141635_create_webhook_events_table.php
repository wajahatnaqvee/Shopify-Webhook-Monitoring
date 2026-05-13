<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
       Schema::create('webhook_events', function (Blueprint $table) {
    $table->id();

    $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

    $table->foreignId('webhook_subscription_id')
        ->nullable()
        ->constrained()
        ->nullOnDelete();

    $table->string('shop_domain')->nullable();

    $table->string('topic');
    $table->string('topic_enum')->nullable();

    $table->string('group')->nullable();
    $table->string('action')->nullable();

    $table->string('webhook_id')->nullable();
    $table->string('api_version')->nullable();
    $table->timestamp('triggered_at')->nullable();

    $table->json('payload')->nullable();
    $table->json('headers')->nullable();

    $table->string('status')->default('pending');

    $table->unsignedInteger('attempts')->default(0);

    $table->timestamp('received_at')->nullable();
    $table->timestamp('processed_at')->nullable();
    $table->timestamp('failed_at')->nullable();

    $table->longText('error_message')->nullable();

    $table->timestamps();

    $table->unique(['shop_domain', 'webhook_id']);

    $table->index(['user_id', 'status']);
    $table->index(['topic', 'status']);
    $table->index(['group', 'action']);
    $table->index('shop_domain');
    $table->index('webhook_subscription_id');
    $table->index('webhook_id');
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('webhook_events');
    }
};
