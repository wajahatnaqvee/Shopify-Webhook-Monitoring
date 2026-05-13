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
      Schema::create('job_logs', function (Blueprint $table) {
    $table->id();

    $table->foreignId('webhook_event_id')
        ->nullable()
        ->constrained('webhook_events')
        ->nullOnDelete();

    $table->string('job_name');
    $table->string('queue_name')->nullable();

    $table->string('status')->default('queued');

    $table->unsignedInteger('attempt')->default(1);

    $table->timestamp('started_at')->nullable();
    $table->timestamp('finished_at')->nullable();

    $table->unsignedBigInteger('duration_ms')->nullable();

    $table->string('exception_class')->nullable();
    $table->longText('error_message')->nullable();

    $table->timestamps();

    $table->index(['webhook_event_id', 'status']);
    $table->index(['job_name', 'status']);
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_logs');
    }
};
