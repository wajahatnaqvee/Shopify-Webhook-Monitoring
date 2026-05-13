<?php

namespace App\Http\Controllers;

use App\Models\WebhookEvent;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Jobs\ProcessWebhookEventJob;
use Illuminate\Http\RedirectResponse;
class WebhookEventController extends Controller
{
   public function index(Request $request): Response
{
    $user = $request->user();

    $events = WebhookEvent::query()
        ->when($user, function ($query) use ($user) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhereNull('user_id'); // keep for debugging; remove later in production
            });
        })
        ->when($request->filled('status'), function ($query) use ($request) {
            $query->where('status', $request->status);
        })
        ->when($request->filled('group'), function ($query) use ($request) {
            $query->where('group', $request->group);
        })
        ->when($request->filled('topic'), function ($query) use ($request) {
            $query->where('topic', $request->topic);
        })
        ->when($request->filled('search'), function ($query) use ($request) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('topic', 'like', "%{$search}%")
                    ->orWhere('topic_enum', 'like', "%{$search}%")
                    ->orWhere('shop_domain', 'like', "%{$search}%")
                    ->orWhere('webhook_id', 'like', "%{$search}%");
            });
        })
        ->latest()
        ->paginate(10)
        ->withQueryString();

    return Inertia::render('WebhookEvents/Index', [
        'events' => $events,
        'filters' => [
            'search' => $request->search,
            'status' => $request->status,
            'group' => $request->group,
            'topic' => $request->topic,
        ],
    ]);
}



    public function show(Request $request, WebhookEvent $webhookEvent): Response
{
    $user = $request->user();

    if ($user && $webhookEvent->user_id !== null && $webhookEvent->user_id !== $user->id) {
        abort(403);
    }

   $webhookEvent->load([
    'attemptLogs' => fn ($query) => $query->latest(),
    'jobLogs' => fn ($query) => $query->latest(),
    'subscription',
]);

    return Inertia::render('WebhookEvents/Show', [
        'event' => [
            'id' => $webhookEvent->id,
            'user_id' => $webhookEvent->user_id,
            'webhook_subscription_id' => $webhookEvent->webhook_subscription_id,
            'shop_domain' => $webhookEvent->shop_domain,
            'topic' => $webhookEvent->topic,
            'topic_enum' => $webhookEvent->topic_enum,
            'group' => $webhookEvent->group,
            'action' => $webhookEvent->action,
            'webhook_id' => $webhookEvent->webhook_id,
            'api_version' => $webhookEvent->api_version,
            'status' => $webhookEvent->status,
            'attempts_count' => $webhookEvent->attempts,
            'received_at' => $webhookEvent->received_at?->format('Y-m-d H:i:s'),
            'processed_at' => $webhookEvent->processed_at?->format('Y-m-d H:i:s'),
            'failed_at' => $webhookEvent->failed_at?->format('Y-m-d H:i:s'),
            'error_message' => $webhookEvent->error_message,
            'payload' => $webhookEvent->payload,
            'headers' => $webhookEvent->headers,

            'subscription' => $webhookEvent->subscription ? [
                'id' => $webhookEvent->subscription->id,
                'topic_enum' => $webhookEvent->subscription->topic_enum,
                'endpoint_url' => $webhookEvent->subscription->endpoint_url,
                'status' => $webhookEvent->subscription->status,
            ] : null,

            'attempt_logs' => $webhookEvent->attemptLogs->map(fn ($attempt) => [
                'id' => $attempt->id,
                'attempt_number' => $attempt->attempt_number,
                'status' => $attempt->status,
                'trigger_type' => $attempt->trigger_type,
                'error_message' => $attempt->error_message,
                'started_at' => $attempt->started_at?->format('Y-m-d H:i:s'),
                'finished_at' => $attempt->finished_at?->format('Y-m-d H:i:s'),
            ]),

            'job_logs' => $webhookEvent->jobLogs->map(fn ($jobLog) => [
                'id' => $jobLog->id,
                'job_name' => $jobLog->job_name,
                'queue_name' => $jobLog->queue_name,
                'status' => $jobLog->status,
                'attempt' => $jobLog->attempt,
                'duration_ms' => $jobLog->duration_ms,
                'exception_class' => $jobLog->exception_class,
                'error_message' => $jobLog->error_message,
                'started_at' => $jobLog->started_at?->format('Y-m-d H:i:s'),
                'finished_at' => $jobLog->finished_at?->format('Y-m-d H:i:s'),
            ]),
        ],
    ]);
}

public function replay(Request $request, WebhookEvent $webhookEvent): RedirectResponse
{
    $user = $request->user();

    if ($user && $webhookEvent->user_id !== null && $webhookEvent->user_id !== $user->id) {
        abort(403);
    }

    if (!in_array($webhookEvent->status, ['failed', 'success', 'ignored', 'pending', 'replayed'])) {
        return back()->with('error', 'This webhook event cannot be replayed right now.');
    }

    $webhookEvent->update([
        'status' => 'pending',
        'failed_at' => null,
        'error_message' => null,
    ]);

    ProcessWebhookEventJob::dispatch($webhookEvent->id, 'manual_replay');

    return back()->with('success', 'Webhook replay has been queued successfully.');
}
}
