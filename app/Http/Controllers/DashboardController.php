<?php
namespace App\Http\Controllers;

use App\Models\JobLog;
use App\Models\WebhookEvent;
use App\Models\WebhookSubscription;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Services\Shopify\WebhookTopicRegistry;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        // ── Subscriptions ─────────────────────────────────────────────────────

        $subQuery            = WebhookSubscription::where('user_id', $user->id);
        $activeSubscriptions = (clone $subQuery)->where('status', 'active')->count();
        $totalSubscriptions  = (clone $subQuery)->count();

        // ── Events ────────────────────────────────────────────────────────────
        // Include user_id = null temporarily so manually-tested events appear.
        // TODO: remove orWhereNull once Shopify webhooks reliably map to user_id.

        $eventQuery    = WebhookEvent::where(function ($q) use ($user) {
            $q->where('user_id', $user->id)->orWhereNull('user_id');
        });
        $totalEvents    = (clone $eventQuery)->count();
        $successEvents  = (clone $eventQuery)->where('status', 'success')->count();
        $failedEvents   = (clone $eventQuery)->where('status', 'failed')->count();
        $pendingEvents  = (clone $eventQuery)->where('status', 'pending')->count();
        $ignoredEvents  = (clone $eventQuery)->where('status', 'ignored')->count();

        // ── Job logs ──────────────────────────────────────────────────────────

        $eventIds       = (clone $eventQuery)->pluck('id');
        $jobLogQuery    = JobLog::whereIn('webhook_event_id', $eventIds);
        $totalJobLogs   = (clone $jobLogQuery)->count();
        $failedJobs     = (clone $jobLogQuery)->where('status', 'failed')->count();
        $successfulJobs = (clone $jobLogQuery)->where('status', 'success')->count();
        $replayAttempts = (clone $jobLogQuery)->where('attempt', '>', 1)->count();
        $avgJobDurationMs = (clone $jobLogQuery)->whereNotNull('duration_ms')->avg('duration_ms');

        $stats = [
            'active_subscriptions'  => $activeSubscriptions,
            'total_subscriptions'   => $totalSubscriptions,
            'total_events'          => $totalEvents,
            'success_events'        => $successEvents,
            'failed_events'         => $failedEvents,
            'pending_events'        => $pendingEvents,
            'ignored_events'        => $ignoredEvents,
            'total_job_logs'        => $totalJobLogs,
            'failed_jobs'           => $failedJobs,
            'successful_jobs'       => $successfulJobs,
            'replay_attempts'       => $replayAttempts,
            'success_rate'          => $totalEvents > 0 ? round(($successEvents / $totalEvents) * 100) : 0,
            'avg_job_duration_ms'   => $avgJobDurationMs !== null ? (int) round($avgJobDurationMs) : null,
        ];

        // ── Health ────────────────────────────────────────────────────────────

        if ($failedEvents > 0 || $failedJobs > 0) {
            $health = [
                'status'  => 'critical',
                'message' => 'Some webhook events or jobs have failed. Inspect the events below and use Replay to retry.',
            ];
        } elseif ($pendingEvents > 0) {
            $health = [
                'status'  => 'warning',
                'message' => 'Some webhook events are still pending. They may be queued for processing.',
            ];
        } else {
            $health = [
                'status'  => 'healthy',
                'message' => 'Webhook processing is running normally. No failures or pending events.',
            ];
        }

        // ── Recent events ─────────────────────────────────────────────────────

        $recentEvents = (clone $eventQuery)
            ->select(['id', 'topic', 'group', 'action', 'shop_domain', 'status', 'attempts', 'received_at'])
            ->latest('received_at')
            ->take(5)
            ->get();

        // ── Recent failed events ──────────────────────────────────────────────

        $recentFailedEvents = (clone $eventQuery)
            ->where('status', 'failed')
            ->select(['id', 'topic', 'group', 'action', 'shop_domain', 'error_message', 'received_at', 'failed_at'])
            ->latest('failed_at')
            ->take(5)
            ->get();

        // ── Active subscription list ──────────────────────────────────────────

        $activeSubscriptionList = WebhookSubscription::where('user_id', $user->id)
            ->where('status', 'active')
            ->select(['id', 'title', 'group', 'action', 'topic_enum', 'topic_header', 'status', 'endpoint_url', 'last_synced_at'])
            ->orderBy('group')
            ->orderBy('action')
            ->get();

        // ── Recent job logs ───────────────────────────────────────────────────

        $recentJobLogs = (clone $jobLogQuery)
            ->select(['id', 'webhook_event_id', 'job_name', 'status', 'attempt', 'duration_ms', 'exception_class', 'error_message', 'started_at', 'finished_at'])
            ->latest('finished_at')
            ->take(5)
            ->get();

        // ── Attention items ────────────────────────────────────────────────

        $attentionItems = collect();

        foreach ($recentFailedEvents as $fe) {
            $attentionItems->push([
                'id'               => 'event-' . $fe->id,
                'type'             => 'Event',
                'title'            => $fe->topic,
                'issue'            => $fe->error_message ?: 'Processing failed',
                'time'             => $fe->failed_at?->toIso8601String(),
                'webhook_event_id' => $fe->id,
            ]);
        }

        $recentFailedJobs = (clone $jobLogQuery)
            ->where('status', 'failed')
            ->select(['id', 'webhook_event_id', 'job_name', 'error_message', 'finished_at'])
            ->latest('finished_at')
            ->take(5)
            ->get();

        foreach ($recentFailedJobs as $fj) {
            $attentionItems->push([
                'id'               => 'job-' . $fj->id,
                'type'             => 'Job',
                'title'            => class_basename($fj->job_name ?? 'Unknown'),
                'issue'            => $fj->error_message ?: 'Job execution failed',
                'time'             => $fj->finished_at?->toIso8601String(),
                'webhook_event_id' => $fj->webhook_event_id,
            ]);
        }

        if ($pendingEvents > 0) {
            $attentionItems->push([
                'id'               => 'pending-events',
                'type'             => 'Pending',
                'title'            => "{$pendingEvents} pending event" . ($pendingEvents > 1 ? 's' : ''),
                'issue'            => 'Waiting for queue processing',
                'time'             => now()->toIso8601String(),
                'webhook_event_id' => null,
            ]);
        }

        return Inertia::render('Dashboard', [
            'stats'                => $stats,
            'health'               => $health,
            'recent_events'        => $recentEvents,
            'recent_failed_events' => $recentFailedEvents,
            'active_subscriptions' => $activeSubscriptionList,
            'recent_job_logs'      => $recentJobLogs,
            'attention_items'      => $attentionItems->values()->all(),
             'webhook_coverage' => $this->buildWebhookCoverage($user),
        ]);
    }
    private function buildWebhookCoverage($user): array
{
    /**
     * 1. Get all supported topics from registry.
     * 2. Group them by Shopify area: Products, Orders, Customers, etc.
     * 3. Count how many are active in webhook_subscriptions.
     */

    $topics = collect(WebhookTopicRegistry::all())
        ->filter(fn ($topic) => ($topic['supported'] ?? false) === true)
        ->filter(fn ($topic) => !empty($topic['group']))
        ->groupBy('group');

    $activeSubscriptions = WebhookSubscription::query()
        ->where('user_id', $user->id)
        ->where('status', 'active')
        ->get();

    return $topics
        ->map(function ($groupTopics, string $group) use ($activeSubscriptions) {
            $topicEnums = $groupTopics
                ->pluck('topic_enum')
                ->filter()
                ->values();

            /**
             * Metaobjects are special:
             * Same topic can be registered multiple times with different filters.
             *
             * Example:
             * METAOBJECTS_CREATE + type:test_metaobject
             * METAOBJECTS_CREATE + type:color_pattern
             *
             * So for Metaobjects we count active rows, not just unique topic_enum.
             */
            if ($group === 'Metaobjects') {
                $activeMetaobjectSubscriptions = $activeSubscriptions
                    ->whereIn('topic_enum', $topicEnums)
                    ->filter(fn ($subscription) => !empty($subscription->filter));

                $activeCount = $activeMetaobjectSubscriptions->count();

                $registeredTypes = $activeMetaobjectSubscriptions
                    ->pluck('metaobject_type')
                    ->filter()
                    ->unique()
                    ->count();

                $baseTotal = $groupTopics->count();

                /**
                 * If one metaobject type is registered for create/update/delete,
                 * total should be 3.
                 *
                 * If two types are registered, total should be 6.
                 */
                $total = $registeredTypes > 0
                    ? $registeredTypes * $baseTotal
                    : $baseTotal;

                return [
                    'group' => $group,
                    'active' => $activeCount,
                    'total' => $total,
                ];
            }

            /**
             * Normal webhooks:
             * Count unique active topic_enum.
             * This prevents duplicate local rows from increasing coverage incorrectly.
             */
            $activeCount = $activeSubscriptions
                ->whereIn('topic_enum', $topicEnums)
                ->pluck('topic_enum')
                ->unique()
                ->count();

            return [
                'group' => $group,
                'active' => $activeCount,
                'total' => $groupTopics->count(),
            ];
        })
        ->values()
        ->toArray();
}
}
