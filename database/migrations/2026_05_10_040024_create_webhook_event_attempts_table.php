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
    {Schema::create('webhook_event_attempts', function (Blueprint $table) {
    $table->id();

    $table->foreignId('webhook_event_id')
        ->constrained('webhook_events')
        ->cascadeOnDelete();

    $table->unsignedInteger('attempt_number')->default(1);

    $table->string('status')->default('processing');

    $table->string('trigger_type')->default('automatic');

    $table->longText('error_message')->nullable();

    $table->timestamp('started_at')->nullable();
    $table->timestamp('finished_at')->nullable();

    $table->timestamps();

    $table->index(['webhook_event_id', 'status']);
    $table->index('trigger_type');
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('webhook_event_attempts');
    }
};
