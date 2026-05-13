<?php

namespace App\Jobs;

use App\Models\JobLog;
use App\Models\WebhookEvent;
use App\Models\WebhookEventAttempt;
use App\Services\Shopify\WebhookEventProcessor;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class ProcessWebhookEventJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(
        public int $webhookEventId,
        public string $triggerType = 'automatic'
    ) {
        //
    }

    public function handle(WebhookEventProcessor $processor): void
    {
        $startedAt = now();
        $startMs = microtime(true);

        $event = WebhookEvent::findOrFail($this->webhookEventId);

        $attemptNumber = $event->attempts + 1;

        $event->update([
            'status' => 'processing',
            'attempts' => $attemptNumber,
            'error_message' => null,
        ]);

        $attempt = WebhookEventAttempt::create([
            'webhook_event_id' => $event->id,
            'attempt_number' => $attemptNumber,
            'status' => 'processing',
            'trigger_type' => $this->triggerType,
            'started_at' => $startedAt,
        ]);

        $jobLog = JobLog::create([
            'webhook_event_id' => $event->id,
            'job_name' => static::class,
            'queue_name' => $this->queue ?? 'default',
            'status' => 'processing',
            'attempt' => $attemptNumber,
            'started_at' => $startedAt,
        ]);

        try {
            $processor->process($event);

            if ($event->fresh()->status !== 'ignored') {
                $event->update([
                    'status' => 'success',
                    'processed_at' => now(),
                    'failed_at' => null,
                    'error_message' => null,
                ]);
            }

            $attempt->update([
                'status' => 'success',
                'finished_at' => now(),
                'error_message' => null,
            ]);

            $jobLog->update([
                'status' => 'success',
                'finished_at' => now(),
                'duration_ms' => (int) ((microtime(true) - $startMs) * 1000),
                'exception_class' => null,
                'error_message' => null,
            ]);
        } catch (Throwable $e) {
            $event->update([
                'status' => 'failed',
                'failed_at' => now(),
                'error_message' => $e->getMessage(),
            ]);

            $attempt->update([
                'status' => 'failed',
                'finished_at' => now(),
                'error_message' => $e->getMessage(),
            ]);

            $jobLog->update([
                'status' => 'failed',
                'finished_at' => now(),
                'duration_ms' => (int) ((microtime(true) - $startMs) * 1000),
                'exception_class' => $e::class,
                'error_message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}