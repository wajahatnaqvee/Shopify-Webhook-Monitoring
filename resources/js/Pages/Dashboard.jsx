import { Head, Link, router } from '@inertiajs/react';
import {
    Page,
    Card,
    BlockStack,
    InlineGrid,
    Text,
    Badge,
    IndexTable,
    Button,
    InlineStack,
    Box,
    Divider,
    ProgressBar,
} from '@shopify/polaris';

import StatusBadge from '@/Components/Webhooks/StatusBadge';
import MetricCard from '@/Components/Webhooks/MetricCard';
import RelativeTime from '@/Components/Webhooks/RelativeTime';
import {
    humanize,
    formatMs,
    percent,
    HEALTH_TONES,
} from '@/Components/Webhooks/utils';

/**
 * Dashboard.jsx
 *
 * Professional dashboard for Shopify Webhook Event Monitor.
 *
 * Expected props from backend:
 * - stats
 * - health
 * - recent_events
 * - attention_items
 * - webhook_coverage optional
 *
 * Optional recommended backend stats:
 * - stats.active_subscriptions
 * - stats.total_events
 * - stats.success_events
 * - stats.pending_events
 * - stats.failed_events
 * - stats.ignored_events
 * - stats.success_rate
 * - stats.failed_jobs
 * - stats.successful_jobs
 * - stats.total_job_logs
 * - stats.avg_job_duration_ms
 * - stats.replay_attempts
 * - stats.events_today
 * - stats.events_last_24_hours
 * - stats.needs_review_count
 * - stats.last_event_received_at
 */

const DASHBOARD_GROUPS = [
    'Products',
    'Orders',
    'Customers',
    'Inventory',
    'Collections',
    'Fulfillment',
    'Checkout',
    'Metaobjects',
];

const ATTENTION_TONES = {
    Event: 'critical',
    Job: 'critical',
    Pending: 'attention',
};

function safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function getNeedsReviewCount(stats = {}, attentionItems = []) {
    if (stats.needs_review_count !== undefined && stats.needs_review_count !== null) {
        return safeNumber(stats.needs_review_count);
    }

    return (
        safeNumber(stats.failed_events) +
        safeNumber(stats.pending_events) +
        safeNumber(stats.failed_jobs) ||
        attentionItems.length
    );
}

function getLastDelivery(stats = {}, recentEvents = []) {
    return stats.last_event_received_at || recentEvents?.[0]?.received_at || null;
}

function getHealthStatus(stats = {}, health = {}, attentionItems = []) {
    const needsReview = getNeedsReviewCount(stats, attentionItems);

    if (needsReview > 0) {
        return {
            status: 'needs_review',
            tone: 'critical',
            title: 'Webhook monitoring needs review',
            message: `${needsReview} item${needsReview > 1 ? 's' : ''} need attention. Review failed events, stuck processing, or failed jobs.`,
        };
    }

    if (health.status === 'processing') {
        return {
            status: 'processing',
            tone: 'attention',
            title: 'Webhook monitoring is processing',
            message: health.message || 'Some webhook events are currently waiting for processing.',
        };
    }

    return {
        status: 'healthy',
        tone: 'success',
        title: 'Webhook monitoring is healthy',
        message: health.message || 'All active webhooks are processing normally.',
    };
}

function getSuccessRateTone(rate) {
    const value = safeNumber(rate);

    if (value >= 95) return 'success';
    if (value >= 80) return 'warning';

    return 'critical';
}

function getCoverageTone(active, total) {
    if (total === 0) return 'info';
    if (active === 0) return 'attention';
    if (active >= total) return 'success';

    return 'warning';
}

function getCoverageLabel(active, total) {
    if (total === 0) return 'Not configured';
    if (active === 0) return 'Not registered';
    if (active >= total) return 'Complete';

    return 'Partial';
}

function normalizeCoverage(coverage = []) {
    if (!Array.isArray(coverage)) return [];

    return coverage.map((item) => ({
        group: item.group,
        active: safeNumber(item.active),
        total: safeNumber(item.total),
    }));
}

function buildFallbackCoverage(stats = {}) {
    const raw = stats.webhook_coverage || stats.coverage || [];

    if (Array.isArray(raw) && raw.length > 0) {
        return normalizeCoverage(raw);
    }

    return [];
}

function getResourceLabel(event = {}) {
    const type = event.resource_type;
    const name = event.resource_name;
    const identifier = event.resource_identifier;

    if (name) {
        if (type === 'product') return `Product: ${name}`;
        if (type === 'order') return `Order: ${name}`;
        if (type === 'customer') return `Customer: ${name}`;
        if (type === 'inventory_item') return `Inventory item: ${name}`;
        if (type === 'collection') return `Collection: ${name}`;
        if (type === 'metaobject') return `Metaobject: ${name}`;
        if (type === 'fulfillment') return `Fulfillment: ${name}`;
        if (type === 'checkout') return `Checkout: ${name}`;

        return name;
    }

    if (identifier) {
        if (type === 'checkout') return `Checkout: ${identifier}`;
        if (type === 'metaobject') return `Metaobject: ${identifier}`;
        if (type === 'fulfillment') return `Fulfillment: ${identifier}`;

        return identifier;
    }

    return null;
}

function getActionTitle(event = {}) {
    const groupLabel = event.group || humanize(event.topic?.split('/')?.[0] || 'Webhook');
    const actionLabel = humanize(event.action || event.topic?.split('/')?.[1] || 'event');

    if (event.status === 'success') {
        return `${groupLabel} ${actionLabel} processed`;
    }

    if (event.status === 'failed') {
        return `${groupLabel} ${actionLabel} failed`;
    }

    if (event.status === 'pending' || event.status === 'processing') {
        return `${groupLabel} ${actionLabel} processing`;
    }

    if (event.status === 'ignored') {
        return `${groupLabel} ${actionLabel} ignored`;
    }

    return `${groupLabel} ${actionLabel}`;
}

function getActivityMeta(event = {}) {
    if (event.status === 'success') {
        return {
            icon: '✓',
            background: '#E3F1DF',
            color: '#008060',
            border: '#AEE9D1',
        };
    }

    if (event.status === 'failed') {
        return {
            icon: '!',
            background: '#FED3D1',
            color: '#D72C0D',
            border: '#F5B7B1',
        };
    }

    if (event.status === 'pending' || event.status === 'processing') {
        return {
            icon: '…',
            background: '#FFF1B8',
            color: '#8A6116',
            border: '#FFD873',
        };
    }

    return {
        icon: '•',
        background: '#EBEBEB',
        color: '#5C5F62',
        border: '#D2D5D8',
    };
}

/* ── Health summary ─────────────────────────────────────────────────────── */
function HealthStatusIcon({ tone }) {
    const isCritical = tone === 'critical';
    const isAttention = tone === 'attention';

    const styles = {
        critical: {
            background: '#FED3D1',
            color: '#D72C0D',
            border: '#F5B7B1',
        },
        attention: {
            background: '#FFF1B8',
            color: '#8A6116',
            border: '#FFD873',
        },
        success: {
            background: '#E3F1DF',
            color: '#008060',
            border: '#AEE9D1',
        },
    };

    const current = isCritical ? styles.critical : isAttention ? styles.attention : styles.success;

    return (
        <div
            style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                display: 'grid',
                placeItems: 'center',
                background: current.background,
                color: current.color,
                border: `1px solid ${current.border}`,
                flexShrink: 0,
            }}
        >
            {isCritical ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M12 3.25L21.25 19.25H2.75L12 3.25Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M12 9V13"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                    />
                    <path
                        d="M12 16.5H12.01"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                    />
                </svg>
            ) : isAttention ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <circle
                        cx="12"
                        cy="12"
                        r="8.5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                    />
                    <path
                        d="M12 7.5V12.25L15 14"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M12 3.25L19 6.25V11.5C19 16.1 16.05 19.65 12 20.75C7.95 19.65 5 16.1 5 11.5V6.25L12 3.25Z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M8.75 12.15L11.1 14.5L15.5 9.75"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            )}
        </div>
    );
}
function HealthSummary({ stats, health, recentEvents, attentionItems }) {
    const current = getHealthStatus(stats, health, attentionItems);
    const lastDelivery = getLastDelivery(stats, recentEvents);
    const activeSubscriptions = safeNumber(stats.active_subscriptions);
    const needsReview = getNeedsReviewCount(stats, attentionItems);

    return (
        <Card>
            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                    <InlineStack gap="400" align='start' blockAlign="start" wrap={false}>
                      <HealthStatusIcon tone={current.tone} />

                        <BlockStack gap="150">
                            <InlineStack gap="200" blockAlign="center" wrap>
                                <Text as="h2" variant="headingLg">
                                    {current.title}
                                </Text>

                                <Badge tone={current.tone}>
                                    {humanize(current.status)}
                                </Badge>
                            </InlineStack>

                            <Text as="p" tone="subdued">
                                {current.message}
                            </Text>

                            <InlineStack gap="400" wrap>
                                <Text as="span" tone="subdued">
                                    {activeSubscriptions} active webhook{activeSubscriptions === 1 ? '' : 's'}
                                </Text>

                                <Text as="span" tone="subdued">
                                    Last delivery:{' '}
                                    {lastDelivery ? <RelativeTime value={lastDelivery} /> : 'No deliveries yet'}
                                </Text>

                                <Text as="span" tone={needsReview > 0 ? 'critical' : 'subdued'}>
                                    {needsReview} need review
                                </Text>
                            </InlineStack>
                        </BlockStack>
                    </InlineStack>

                    <InlineStack gap="200" wrap>
                        {needsReview > 0 && (
                            <Button onClick={() => router.visit(route('webhook-events.index'))}>
                                Review issues
                            </Button>
                        )}

                        {/* <Button
                            variant="primary"
                            onClick={() => router.visit(route('webhook-subscriptions.index'))}
                        >
                            Manage webhooks
                        </Button> */}
                    </InlineStack>
                </InlineStack>
            </BlockStack>
        </Card>
    );
}

/* ── Setup checklist ─────────────────────────────────────────────────────── */

function SetupChecklist({ activeSubscriptions }) {
    if (safeNumber(activeSubscriptions) > 0) return null;

    return (
        <Card>
            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                    <BlockStack gap="150">
                        <Text as="h2" variant="headingMd">
                            Start monitoring Shopify webhooks
                        </Text>

                        <Text as="p" tone="subdued">
                            Register webhooks, sync them from Shopify, then perform actions in your store to receive events.
                        </Text>
                    </BlockStack>

                    <Button
                        variant="primary"
                        onClick={() => router.visit(route('webhook-subscriptions.index'))}
                    >
                        Register webhooks
                    </Button>
                </InlineStack>

                <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="300">
                    {[
                        ['1', 'Register recommended webhooks'],
                        ['2', 'Sync subscriptions from Shopify'],
                        ['3', 'Trigger a test event in Shopify'],
                        ['4', 'Review delivery and replay failures'],
                    ].map(([step, label]) => (
                        <Box key={step} background="bg-surface-secondary" padding="300" borderRadius="300">
                            <InlineStack gap="300" blockAlign="center" wrap={false}>
                                <div
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        background: '#303030',
                                        color: '#ffffff',
                                        display: 'grid',
                                        placeItems: 'center',
                                        fontWeight: 700,
                                        flexShrink: 0,
                                    }}
                                >
                                    {step}
                                </div>

                                <Text as="p" variant="bodySm" fontWeight="semibold">
                                    {label}
                                </Text>
                            </InlineStack>
                        </Box>
                    ))}
                </InlineGrid>
            </BlockStack>
        </Card>
    );
}

/* ── KPI cards ───────────────────────────────────────────────────────────── */

function DashboardKpis({ stats, attentionItems }) {
    const eventsToday = stats.events_today ?? stats.events_last_24_hours ?? stats.total_events ?? 0;
    const needsReview = getNeedsReviewCount(stats, attentionItems);
    const successRate = safeNumber(stats.success_rate);

    return (
        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
            <MetricCard
                title="Active Webhooks"
                value={stats.active_subscriptions ?? 0}
                helper="Shopify topics currently monitored"
                tone="success"
            />

            <MetricCard
                title={stats.events_today !== undefined ? 'Events Today' : 'Recent Events'}
                value={eventsToday}
                helper={stats.events_today !== undefined ? 'Deliveries received today' : 'Webhook deliveries received'}
                tone="info"
            />

            <MetricCard
                title="Success Rate"
                value={`${successRate}%`}
                helper="Webhook processing reliability"
                tone={getSuccessRateTone(successRate)}
            />

            <MetricCard
                title="Needs Review"
                value={needsReview}
                helper="Failed or stuck items"
                tone={needsReview > 0 ? 'critical' : 'success'}
            />
        </InlineGrid>
    );
}

/* ── Webhook coverage ────────────────────────────────────────────────────── */

function WebhookCoverage({ coverage }) {
    const normalized = normalizeCoverage(coverage);
    const hasCoverage = normalized.length > 0;

    return (
        <Card>
            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                    <BlockStack gap="100">
                        <Text as="h2" variant="headingMd">
                            Webhook Coverage
                        </Text>

                        <Text as="p" tone="subdued">
                            See which Shopify areas are currently monitored by this app.
                        </Text>
                    </BlockStack>

                    <Button
                        variant="plain"
                        onClick={() => router.visit(route('webhook-subscriptions.index'))}
                    >
                        Manage coverage
                    </Button>
                </InlineStack>

                {hasCoverage ? (
                    <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="300">
                        {normalized.map((item) => {
                            const progress = item.total > 0 ? Math.round((item.active / item.total) * 100) : 0;
                            const tone = getCoverageTone(item.active, item.total);

                            return (
                                <Box
                                    key={item.group}
                                    background="bg-surface-secondary"
                                    padding="300"
                                    borderRadius="300"
                                >
                                    <BlockStack gap="250">
                                        <InlineStack align="space-between" blockAlign="center" gap="200" wrap>
                                            <Text as="h3" variant="bodyMd" fontWeight="semibold">
                                                {item.group}
                                            </Text>

                                            <Badge tone={tone}>
                                                {getCoverageLabel(item.active, item.total)}
                                            </Badge>
                                        </InlineStack>

                                        <BlockStack gap="150">
                                            <Text as="p" variant="bodySm" tone="subdued">
                                                {item.active} of {item.total} active
                                            </Text>

                                            <ProgressBar
                                                progress={progress}
                                                tone={tone === 'critical' ? 'critical' : tone === 'attention' ? 'attention' : 'success'}
                                                size="small"
                                            />
                                        </BlockStack>
                                    </BlockStack>
                                </Box>
                            );
                        })}
                    </InlineGrid>
                ) : (
                    <Box padding="500" background="bg-surface-secondary" borderRadius="300">
                        <BlockStack gap="150" inlineAlign="center">
                            <Text as="p" variant="bodyMd" alignment="center" fontWeight="semibold">
                                Coverage data is not available yet
                            </Text>

                            <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                                Add webhook_coverage from the dashboard backend to show group-level monitoring status.
                            </Text>
                        </BlockStack>
                    </Box>
                )}
            </BlockStack>
        </Card>
    );
}

/* ── Event status chart ──────────────────────────────────────────────────── */

function EventDonut({ stats }) {
    const total = safeNumber(stats.total_events);
    const success = safeNumber(stats.success_events);
    const pending = safeNumber(stats.pending_events);
    const failed = safeNumber(stats.failed_events);
    const ignored = safeNumber(stats.ignored_events);

    const successPct = percent(success, total);
    const pendingPct = percent(pending, total);
    const failedPct = percent(failed, total);
    const ignoredPct = percent(ignored, total);

    const hasData = total > 0;

    return (
        <Card>
            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                    <BlockStack gap="100">
                        <Text as="h2" variant="headingMd">
                            Webhook Delivery Status
                        </Text>

                        <Text as="p" tone="subdued">
                            Breakdown of received webhook events by processing state.
                        </Text>
                    </BlockStack>

                    <Badge tone={failed > 0 ? 'critical' : pending > 0 ? 'attention' : 'success'}>
                        {failed > 0 ? 'Needs review' : pending > 0 ? 'Processing' : 'Healthy'}
                    </Badge>
                </InlineStack>

                {hasData ? (
                    <InlineGrid columns={{ xs: 1, md: 2 }} gap="500">
                        <Box>
                            <div
                                style={{
                                    width: 172,
                                    height: 172,
                                    borderRadius: '50%',
                                    margin: '0 auto',
                                    background: `conic-gradient(
                                        #008060 0 ${successPct}%,
                                        #FBC02D ${successPct}% ${successPct + pendingPct}%,
                                        #D72C0D ${successPct + pendingPct}% ${successPct + pendingPct + failedPct}%,
                                        #BABFC3 ${successPct + pendingPct + failedPct}% 100%
                                    )`,
                                    display: 'grid',
                                    placeItems: 'center',
                                }}
                            >
                                <div
                                    style={{
                                        width: 108,
                                        height: 108,
                                        borderRadius: '50%',
                                        background: '#ffffff',
                                        display: 'grid',
                                        placeItems: 'center',
                                        textAlign: 'center',
                                    }}
                                >
                                    <BlockStack gap="050">
                                        <Text as="p" variant="headingLg">
                                            {total}
                                        </Text>
                                        <Text as="p" variant="bodySm" tone="subdued">
                                            Events
                                        </Text>
                                    </BlockStack>
                                </div>
                            </div>
                        </Box>

                        <BlockStack gap="300">
                            <Legend label="Success" value={success} pct={successPct} color="#008060" />
                            <Legend label="Pending" value={pending} pct={pendingPct} color="#FBC02D" />
                            <Legend label="Failed" value={failed} pct={failedPct} color="#D72C0D" />
                            <Legend label="Ignored" value={ignored} pct={ignoredPct} color="#BABFC3" />
                        </BlockStack>
                    </InlineGrid>
                ) : (
                    <Box padding="500" background="bg-surface-secondary" borderRadius="300">
                        <BlockStack gap="150" inlineAlign="center">
                            <Text as="p" variant="bodyMd" alignment="center" fontWeight="semibold">
                                No webhook events received yet
                            </Text>

                            <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                                Register webhooks and trigger an action in Shopify to start monitoring deliveries.
                            </Text>
                        </BlockStack>
                    </Box>
                )}
            </BlockStack>
        </Card>
    );
}

function Legend({ label, value, pct, color }) {
    return (
        <BlockStack gap="100">
            <InlineStack align="space-between" blockAlign="center">
                <InlineStack gap="200" blockAlign="center">
                    <span
                        style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: color,
                            display: 'inline-block',
                        }}
                    />

                    <Text as="span">{label}</Text>
                </InlineStack>

                <Text as="span" tone="subdued">
                    {value} · {pct}%
                </Text>
            </InlineStack>

            <div
                style={{
                    height: 7,
                    borderRadius: 999,
                    background: '#EBEBEB',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: color,
                    }}
                />
            </div>
        </BlockStack>
    );
}

/* ── Processing health ───────────────────────────────────────────────────── */

function ProcessingHealth({ stats }) {
    const totalJobs = safeNumber(stats.total_job_logs);
    const successfulJobs = safeNumber(stats.successful_jobs);
    const failedJobs = safeNumber(stats.failed_jobs);

    const successPct = percent(successfulJobs, totalJobs);
    const failedPct = percent(failedJobs, totalJobs);

    return (
        <Card>
            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                    <BlockStack gap="100">
                        <Text as="h2" variant="headingMd">
                            Processing Health
                        </Text>

                        <Text as="p" tone="subdued">
                            Shows how quickly webhook events are processed after Shopify delivers them.
                        </Text>
                    </BlockStack>

                    <Badge tone={failedJobs > 0 ? 'critical' : 'success'}>
                        {failedJobs > 0 ? 'Needs review' : 'Running normally'}
                    </Badge>
                </InlineStack>

                <BlockStack gap="400">
                    <BlockStack gap="200">
                        <InlineStack align="space-between">
                            <Text as="span">Successful processing</Text>

                            <Text as="span" fontWeight="semibold">
                                {successfulJobs} / {totalJobs}
                            </Text>
                        </InlineStack>

                        <ProgressBar progress={successPct} tone="success" size="small" />
                    </BlockStack>

                    <BlockStack gap="200">
                        <InlineStack align="space-between">
                            <Text as="span">Failed processing</Text>

                            <Text as="span" fontWeight="semibold">
                                {failedJobs} / {totalJobs}
                            </Text>
                        </InlineStack>

                        <ProgressBar
                            progress={failedPct}
                            tone={failedJobs > 0 ? 'critical' : 'success'}
                            size="small"
                        />
                    </BlockStack>
                </BlockStack>

                <Divider />

                <InlineGrid columns={{ xs: 1, sm: 2 }} gap="300">
                    <Box background="bg-surface-secondary" padding="300" borderRadius="300">
                        <BlockStack gap="100">
                            <Text as="p" variant="bodySm" tone="subdued">
                                Average processing time
                            </Text>

                            <Text as="p" variant="headingMd">
                                {formatMs(stats.avg_job_duration_ms)}
                            </Text>

                            <Text as="p" variant="bodySm" tone="subdued">
                                Speed of completed webhook jobs
                            </Text>
                        </BlockStack>
                    </Box>

                    <Box background="bg-surface-secondary" padding="300" borderRadius="300">
                        <BlockStack gap="100">
                            <Text as="p" variant="bodySm" tone="subdued">
                                Manual replays
                            </Text>

                            <Text as="p" variant="headingMd">
                                {stats.replay_attempts ?? 0}
                            </Text>

                            <Text as="p" variant="bodySm" tone="subdued">
                                Recovery attempts started from the app
                            </Text>
                        </BlockStack>
                    </Box>
                </InlineGrid>
            </BlockStack>
        </Card>
    );
}

/* ── Needs attention ─────────────────────────────────────────────────────── */

function AttentionTable({ items = [] }) {
    const hasIssues = items.length > 0;

    return (
        <Card>
            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                    <BlockStack gap="100">
                        <InlineStack align="start" gap="200" blockAlign="center" wrap>
                            <Text as="h2" variant="headingMd">
                                Needs Attention
                            </Text>

                            <Badge tone={hasIssues ? 'critical' : 'success'}>
                                {hasIssues ? `${items.length} open issue${items.length > 1 ? 's' : ''}` : 'All clear'}
                            </Badge>
                        </InlineStack>

                        <Text as="p" tone="subdued">
                            Failed events, failed processing jobs, and pending webhook deliveries that may need action.
                        </Text>
                    </BlockStack>

                    <Button
                        variant="plain"
                        onClick={() => router.visit(route('webhook-events.index'))}
                    >
                        View events
                    </Button>
                </InlineStack>

                {hasIssues ? (
                    <IndexTable
                        resourceName={{ singular: 'attention item', plural: 'attention items' }}
                        itemCount={items.length}
                        selectable={false}
                        headings={[
                            { title: 'Type' },
                            { title: 'Topic / Job' },
                            { title: 'Issue' },
                            { title: 'Time' },
                            { title: 'Action' },
                        ]}
                    >
                        {items.map((item, index) => (
                            <IndexTable.Row id={String(item.id)} key={`${item.type}-${item.id}`} position={index}>
                                <IndexTable.Cell>
                                    <Badge tone={ATTENTION_TONES[item.type] ?? 'attention'}>
                                        {item.type}
                                    </Badge>
                                </IndexTable.Cell>

                                <IndexTable.Cell>
                                    <Text as="span" fontWeight="semibold">
                                        {item.title}
                                    </Text>
                                </IndexTable.Cell>

                                <IndexTable.Cell>
                                    <Text as="span" tone={item.type === 'Pending' ? 'subdued' : 'critical'}>
                                        {item.issue?.length > 80 ? `${item.issue.slice(0, 80)}...` : item.issue}
                                    </Text>
                                </IndexTable.Cell>

                                <IndexTable.Cell>
                                    <RelativeTime value={item.time} />
                                </IndexTable.Cell>

                                <IndexTable.Cell>
                                    {item.webhook_event_id ? (
                                        <InlineStack gap="200">
                                            <Link href={route('webhook-events.show', item.webhook_event_id)}>
                                                View
                                            </Link>
                                        </InlineStack>
                                    ) : (
                                        '—'
                                    )}
                                </IndexTable.Cell>
                            </IndexTable.Row>
                        ))}
                    </IndexTable>
                ) : (
                    <Box padding="500" background="bg-surface-secondary" borderRadius="300">
                        <InlineStack align="start" gap="400" blockAlign="center" wrap={false}>
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    background: '#E3F1DF',
                                    display: 'grid',
                                    placeItems: 'center',
                                    fontSize: 22,
                                    fontWeight: 700,
                                    color: '#008060',
                                    flexShrink: 0,
                                }}
                            >
                                ✓
                            </div>

                            <BlockStack gap="100">
                                <Text as="h3" variant="headingMd">
                                    All clear
                                </Text>

                                <Text as="p" tone="subdued">
                                    No failed webhook events, failed jobs, or stuck processing items were found.
                                </Text>
                            </BlockStack>
                        </InlineStack>
                    </Box>
                )}
            </BlockStack>
        </Card>
    );
}

/* ── Recent activity ─────────────────────────────────────────────────────── */

function RecentActivity({ events = [] }) {
    const latestEvents = events.slice(0, 5);

    return (
        <Card>
            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                    <BlockStack gap="100">
                        <Text as="h2" variant="headingMd">
                            Recent Activity
                        </Text>

                        <Text as="p" tone="subdued">
                            Latest Shopify webhook deliveries and processing results.
                        </Text>
                    </BlockStack>

                    <Button
                        variant="plain"
                        onClick={() => router.visit(route('webhook-events.index'))}
                    >
                        View all
                    </Button>
                </InlineStack>

                {latestEvents.length > 0 ? (
                    <BlockStack gap="300">
                        {latestEvents.map((event, index) => {
                            const meta = getActivityMeta(event);
                            const resourceLabel = getResourceLabel(event);
                            const isLast = index === latestEvents.length - 1;
                            const isCheckoutUpdate = event.topic === 'checkouts/update';

                            return (
                                <InlineStack
                                    key={event.id}
                                    gap="300"
                                    align="start"
                                    blockAlign="start"
                                    wrap={false}
                                >
                                    <BlockStack gap="000" inlineAlign="center">
                                        <div
                                            style={{
                                                width: 38,
                                                height: 38,
                                                borderRadius: '50%',
                                                background: meta.background,
                                                color: meta.color,
                                                display: 'grid',
                                                placeItems: 'center',
                                                fontWeight: 700,
                                                border: `1px solid ${meta.border}`,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {meta.icon}
                                        </div>

                                        {!isLast && (
                                            <div
                                                style={{
                                                    width: 2,
                                                    height: 34,
                                                    background: '#E1E3E5',
                                                    marginTop: 6,
                                                }}
                                            />
                                        )}
                                    </BlockStack>

                                    <Box
                                        padding="300"
                                        background="bg-surface-secondary"
                                        borderRadius="300"
                                        width="100%"
                                    >
                                        <InlineStack align="space-between" blockAlign="center" gap="400" wrap>
                                            <BlockStack gap="100">
                                                <InlineStack gap="200" blockAlign="center" wrap>
                                                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                                                        {getActionTitle(event)}
                                                    </Text>

                                                    <StatusBadge status={event.status} />
                                                </InlineStack>

                                                {resourceLabel && (
                                                    <Text as="p" variant="bodySm">
                                                        {resourceLabel}
                                                    </Text>
                                                )}

                                                <Text as="p" variant="bodySm" tone="subdued">
                                                    {event.topic} · Attempt #{event.attempts ?? 0}
                                                </Text>

                                                {isCheckoutUpdate && (
                                                    <Text as="p" variant="bodySm" tone="subdued">
                                                        Checkout updates can happen multiple times during one customer checkout session.
                                                    </Text>
                                                )}
                                            </BlockStack>

                                            <InlineStack gap="400" blockAlign="center">
                                                <RelativeTime value={event.received_at} />

                                                <Link href={route('webhook-events.show', event.id)}>
                                                    View
                                                </Link>
                                            </InlineStack>
                                        </InlineStack>
                                    </Box>
                                </InlineStack>
                            );
                        })}
                    </BlockStack>
                ) : (
                    <Box padding="500" background="bg-surface-secondary" borderRadius="300">
                        <BlockStack gap="150" inlineAlign="center">
                            <Text as="p" variant="bodyMd" alignment="center" fontWeight="semibold">
                                No webhook activity yet
                            </Text>

                            <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                                Register webhooks, then create a product, order, customer, collection, checkout, or fulfillment in Shopify.
                            </Text>
                        </BlockStack>
                    </Box>
                )}
            </BlockStack>
        </Card>
    );
}

/* ── Main page ───────────────────────────────────────────────────────────── */

export default function Dashboard({
    stats = {},
    health = {},
    recent_events = [],
    attention_items = [],
    webhook_coverage = [],
}) {
    const coverage = webhook_coverage.length > 0
        ? webhook_coverage
        : buildFallbackCoverage(stats);

    return (
        <>
            <Head title="Dashboard" />

            <Page
                title="Webhook Monitor"
                subtitle="Monitor Shopify webhook delivery, processing health, failures, and replay recovery."
                primaryAction={{
                    content: 'Manage Webhooks',
                    onAction: () => router.visit(route('webhook-subscriptions.index')),
                }}
                secondaryActions={[
                    {
                        content: 'View Events',
                        onAction: () => router.visit(route('webhook-events.index')),
                    },
                ]}
            >
                <BlockStack gap="500">
                    <HealthSummary
                        stats={stats}
                        health={health}
                        recentEvents={recent_events}
                        attentionItems={attention_items}
                    />

                    <SetupChecklist activeSubscriptions={stats.active_subscriptions} />

                    <DashboardKpis stats={stats} attentionItems={attention_items} />

                    <WebhookCoverage coverage={coverage} />

                    <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                        <EventDonut stats={stats} />
                        <ProcessingHealth stats={stats} />
                    </InlineGrid>

                    <AttentionTable items={attention_items} />

                    <RecentActivity events={recent_events} />

                    <Card>
                        <Box padding="300">
                            <Text as="p" variant="bodySm" tone="subdued">
                                The app/uninstalled lifecycle webhook is managed automatically by the system and is not shown in the monitored webhook coverage.
                            </Text>
                        </Box>
                    </Card>
                </BlockStack>
            </Page>
        </>
    );
}