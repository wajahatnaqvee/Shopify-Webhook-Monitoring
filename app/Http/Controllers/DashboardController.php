<?php
namespace App\Http\Controllers;

use App\Models\JobLog;
use App\Models\WebhookEvent;
use App\Models\WebhookSubscription;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

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

        $stats = [
            'active_subscriptions' => $activeSubscriptions,
            'total_subscriptions'  => $totalSubscriptions,
            'total_events'         => $totalEvents,
            'success_events'       => $successEvents,
            'failed_events'        => $failedEvents,
            'pending_events'       => $pendingEvents,
            'ignored_events'       => $ignoredEvents,
            'total_job_logs'       => $totalJobLogs,
            'failed_jobs'          => $failedJobs,
            'successful_jobs'      => $successfulJobs,
            'replay_attempts'      => $replayAttempts,
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

        return Inertia::render('Dashboard', [
            'stats'                => $stats,
            'health'               => $health,
            'recent_events'        => $recentEvents,
            'recent_failed_events' => $recentFailedEvents,
            'active_subscriptions' => $activeSubscriptionList,
            'recent_job_logs'      => $recentJobLogs,
        ]);
    }
}
