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
    EmptyState,
} from '@shopify/polaris';

const TONES = {
    health: {
        healthy: 'success',
        warning: 'attention',
        critical: 'critical',
    },
    status: {
        pending: 'attention',
        processing: 'info',
        success: 'success',
        failed: 'critical',
        ignored: 'subdued',
        replayed: 'warning',
    },
    attention: {
        Event: 'critical',
        Job: 'critical',
        Pending: 'attention',
    },
};

function humanize(value) {
    if (!value) return '—';

    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
    if (!value) return '—';

    return value;
}

function formatMs(value) {
    if (value == null) return '—';

    return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`;
}

function percent(value, total) {
    if (!total || total <= 0) return 0;

    return Math.round((Number(value || 0) / Number(total)) * 100);
}

function StatusBadge({ status }) {
    return (
        <Badge tone={TONES.status[status] ?? 'subdued'}>
            {humanize(status)}
        </Badge>
    );
}

function MetricCard({ title, value, helper, tone = 'default' }) {
    const colors = {
        default: '#202223',
        success: '#008060',
        critical: '#D72C0D',
        warning: '#B98900',
        info: '#2C6ECB',
    };

    return (
        <Card>
            <BlockStack gap="300">
                <Text as="p" variant="bodyMd" tone="subdued">
                    {title}
                </Text>

                <Text as="p" variant="heading2xl" fontWeight="bold">
                    <span style={{ color: colors[tone] ?? colors.default }}>
                        {value ?? 0}
                    </span>
                </Text>

                <Text as="p" variant="bodySm" tone="subdued">
                    {helper}
                </Text>
            </BlockStack>
        </Card>
    );
}

function EventDonut({ stats }) {
    const total = Number(stats.total_events || 0);
    const success = Number(stats.success_events || 0);
    const pending = Number(stats.pending_events || 0);
    const failed = Number(stats.failed_events || 0);
    const ignored = Number(stats.ignored_events || 0);

    const successPct = percent(success, total);
    const pendingPct = percent(pending, total);
    const failedPct = percent(failed, total);
    const ignoredPct = percent(ignored, total);

    return (
        <Card>
            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start">
                    <BlockStack gap="100">
                        <Text as="h2" variant="headingMd">
                            Event Status
                        </Text>
                        <Text as="p" tone="subdued">
                            Breakdown of received webhook events.
                        </Text>
                    </BlockStack>

                    <Badge tone={failed > 0 ? 'critical' : pending > 0 ? 'attention' : 'success'}>
                        {failed > 0 ? 'Review' : pending > 0 ? 'Processing' : 'Stable'}
                    </Badge>
                </InlineStack>

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

function QueueSummary({ stats }) {
    const totalJobs = Number(stats.total_job_logs || 0);
    const successfulJobs = Number(stats.successful_jobs || 0);
    const failedJobs = Number(stats.failed_jobs || 0);

    const successPct = percent(successfulJobs, totalJobs);
    const failedPct = percent(failedJobs, totalJobs);

    return (
        <Card>
            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start">
                    <BlockStack gap="100">
                        <Text as="h2" variant="headingMd">
                            Queue Summary
                        </Text>
                        <Text as="p" tone="subdued">
                            Background processing and replay health.
                        </Text>
                    </BlockStack>

                    <Badge tone={failedJobs > 0 ? 'critical' : 'success'}>
                        {failedJobs > 0 ? 'Failures found' : 'Running'}
                    </Badge>
                </InlineStack>

                <BlockStack gap="400">
                    <BlockStack gap="200">
                        <InlineStack align="space-between">
                            <Text as="span">Successful jobs</Text>
                            <Text as="span" fontWeight="semibold">
                                {successfulJobs} / {totalJobs}
                            </Text>
                        </InlineStack>
                        <ProgressBar progress={successPct} tone="success" size="small" />
                    </BlockStack>

                    <BlockStack gap="200">
                        <InlineStack align="space-between">
                            <Text as="span">Failed jobs</Text>
                            <Text as="span" fontWeight="semibold">
                                {failedJobs} / {totalJobs}
                            </Text>
                        </InlineStack>
                        <ProgressBar progress={failedPct} tone={failedJobs > 0 ? 'critical' : 'success'} size="small" />
                    </BlockStack>
                </BlockStack>

                <Divider />

                <InlineGrid columns={2} gap="300">
                    <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                        <BlockStack gap="100">
                            <Text as="p" variant="bodySm" tone="subdued">
                                Avg. duration
                            </Text>
                            <Text as="p" variant="headingMd">
                                {formatMs(stats.avg_job_duration_ms)}
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                                Processing speed
                            </Text>
                        </BlockStack>
                    </Box>

                    <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                        <BlockStack gap="100">
                            <Text as="p" variant="bodySm" tone="subdued">
                                Replay attempts
                            </Text>
                            <Text as="p" variant="headingMd">
                                {stats.replay_attempts ?? 0}
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                                Manual recoveries
                            </Text>
                        </BlockStack>
                    </Box>
                </InlineGrid>
            </BlockStack>
        </Card>
    );
}

function AttentionTable({ items }) {
    const hasIssues = items.length > 0;

    return (
        <Card>
            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start">
                    <BlockStack gap="100">
                        <InlineStack align='start' gap="200" blockAlign="center">
                            <Text as="h2" variant="headingMd">
                                Needs Attention
                            </Text>

                            <Badge tone={hasIssues ? 'critical' : 'success'}>
                                {hasIssues ? `${items.length} open issue${items.length > 1 ? 's' : ''}` : 'All clear'}
                            </Badge>
                        </InlineStack>

                        <Text as="p" tone="subdued">
                            Failed events, failed jobs, and pending webhook processing are monitored here.
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
                            { title: '' },
                        ]}
                    >
                        {items.map((item, index) => (
                            <IndexTable.Row id={String(item.id)} key={item.id} position={index}>
                                <IndexTable.Cell>
                                    <Badge tone={TONES.attention[item.type] ?? 'attention'}>
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
                                        {item.issue?.length > 70 ? `${item.issue.slice(0, 70)}...` : item.issue}
                                    </Text>
                                </IndexTable.Cell>

                                <IndexTable.Cell>{formatDate(item.time)}</IndexTable.Cell>

                                <IndexTable.Cell>
                                    {item.webhook_event_id ? (
                                        <Link href={route('webhook-events.show', item.webhook_event_id)}>
                                            View
                                        </Link>
                                    ) : (
                                        '—'
                                    )}
                                </IndexTable.Cell>
                            </IndexTable.Row>
                        ))}
                    </IndexTable>
                ) : (
                    <Box
                        padding="500"
                        background="bg-surface-secondary"
                        borderRadius="300"
                    >
                        <InlineStack align="space-between" blockAlign="center" gap="500" wrap>
                            <InlineStack align="start" gap="400" blockAlign="center">
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
                                    }}
                                >
                                    ✓
                                </div>

                                <BlockStack gap="100">
                                    <Text as="h3" variant="headingMd">
                                        No issues need attention
                                    </Text>

                                    <Text as="p" tone="subdued">
                                        No failed webhook events, failed queue jobs, or pending processing items were found.
                                    </Text>
                                </BlockStack>
                            </InlineStack>

                            <InlineStack gap="400" wrap>
                                <Box
                                    padding="300"
                                    background="bg-surface"
                                    borderRadius="200"
                                    minWidth="140px"
                                >
                                    <BlockStack gap="050">
                                        <Text as="p" variant="bodySm" tone="subdued">
                                            Failed events
                                        </Text>
                                        <Text as="p" variant="headingMd">
                                            0
                                        </Text>
                                    </BlockStack>
                                </Box>

                                <Box
                                    padding="300"
                                    background="bg-surface"
                                    borderRadius="200"
                                    minWidth="140px"
                                >
                                    <BlockStack gap="050">
                                        <Text as="p" variant="bodySm" tone="subdued">
                                            Failed jobs
                                        </Text>
                                        <Text as="p" variant="headingMd">
                                            0
                                        </Text>
                                    </BlockStack>
                                </Box>

                                <Box
                                    padding="300"
                                    background="bg-surface"
                                    borderRadius="200"
                                    minWidth="140px"
                                >
                                    <BlockStack gap="050">
                                        <Text as="p" variant="bodySm" tone="subdued">
                                            Pending items
                                        </Text>
                                        <Text as="p" variant="headingMd">
                                            0
                                        </Text>
                                    </BlockStack>
                                </Box>
                            </InlineStack>
                        </InlineStack>
                    </Box>
                )}
            </BlockStack>
        </Card>
    );
}
function getActivityMeta(event) {
    const actionLabel = humanize(event.action || event.topic?.split('/')?.[1]);
    const groupLabel = event.group || humanize(event.topic?.split('/')?.[0]);

    if (event.status === 'success') {
        return {
            icon: '✓',
            title: `${groupLabel} ${actionLabel} processed successfully`,
            description: `${event.topic} · Attempt #${event.attempts ?? 0}`,
            background: '#E3F1DF',
            color: '#008060',
            border: '#AEE9D1',
        };
    }

    if (event.status === 'failed') {
        return {
            icon: '!',
            title: `${groupLabel} ${actionLabel} failed`,
            description: `${event.topic} · Needs review`,
            background: '#FED3D1',
            color: '#D72C0D',
            border: '#F5B7B1',
        };
    }

    if (event.status === 'pending' || event.status === 'processing') {
        return {
            icon: '…',
            title: `${groupLabel} ${actionLabel} is processing`,
            description: `${event.topic} · Waiting for queue`,
            background: '#FFF1B8',
            color: '#8A6116',
            border: '#FFD873',
        };
    }

    return {
        icon: '•',
        title: `${groupLabel} ${actionLabel}`,
        description: event.topic,
        background: '#EBEBEB',
        color: '#5C5F62',
        border: '#D2D5D8',
    };
}

function RecentActivity({ events }) {
    const latestEvents = events.slice(0, 5);

    return (
        <Card>
            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start">
                    <BlockStack gap="100">
                        <Text as="h2" variant="headingMd">
                            Recent Activity
                        </Text>
                        <Text as="p" tone="subdued">
                            Latest webhook deliveries and processing results.
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
                            const isLast = index === latestEvents.length - 1;

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
                                                        {meta.title}
                                                    </Text>

                                                    <StatusBadge status={event.status} />
                                                </InlineStack>

                                                <Text as="p" variant="bodySm" tone="subdued">
                                                    {meta.description}
                                                </Text>
                                            </BlockStack>

                                            <InlineStack gap="400" blockAlign="center">
                                                <Text as="span" variant="bodySm" tone="subdued">
                                                    {formatDate(event.received_at)}
                                                </Text>

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
                    <Box padding="600">
                        <EmptyState
                            heading="No webhook activity yet"
                            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        >
                            <Text as="p" tone="subdued">
                                Recent webhook deliveries will appear here after Shopify sends product or order events.
                            </Text>
                        </EmptyState>
                    </Box>
                )}
            </BlockStack>
        </Card>
    );
}

export default function Dashboard({
    stats = {},
    health = {},
    recent_events = [],
    attention_items = [],
}) {
    const healthTone = TONES.health[health.status] ?? 'info';

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
                    <Card>
                        <InlineStack align="space-between" blockAlign="center" gap="500" wrap>
                            <BlockStack gap="200">
                                <InlineStack gap="300" align='start' blockAlign="center">
                                    <Box>
                                        <Text as="h2" variant="headingLg">
                                            {health.title || 'System Health'}
                                        </Text>

                                    </Box>
                                    <Box>
                                        <Badge tone={healthTone}>
                                            {humanize(health.status || 'unknown')}
                                        </Badge>

                                    </Box>
                                </InlineStack>

                                <Text as="p" tone="subdued">
                                    {health.message || 'Webhook health information is not available yet.'}
                                </Text>
                            </BlockStack>

                            <Box
                                background="bg-surface-secondary"
                                padding="300"
                                borderRadius="200"
                            >
                                <BlockStack gap="100">
                                    <Text as="p" variant="bodySm" tone="subdued">
                                        Current focus
                                    </Text>

                                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                                        {health.status === 'critical'
                                            ? 'Review failed jobs and replay events'
                                            : health.status === 'warning'
                                                ? 'Check pending webhooks'
                                                : 'System is running normally'}
                                    </Text>
                                </BlockStack>
                            </Box>
                        </InlineStack>
                    </Card>

                    <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
                        <MetricCard
                            title="Active Subscriptions"
                            value={stats.active_subscriptions}
                            helper="Registered Shopify webhooks"
                            tone="success"
                        />

                        <MetricCard
                            title="Total Events"
                            value={stats.total_events}
                            helper="Webhook deliveries received"
                            tone="info"
                        />

                        <MetricCard
                            title="Success Rate"
                            value={`${stats.success_rate ?? 0}%`}
                            helper="Successfully processed events"
                            tone={(stats.success_rate ?? 0) >= 90 ? 'success' : 'warning'}
                        />

                        <MetricCard
                            title="Failed Jobs"
                            value={stats.failed_jobs}
                            helper="Queue failures recorded"
                            tone={stats.failed_jobs > 0 ? 'critical' : 'success'}
                        />
                    </InlineGrid>

                    <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                        <EventDonut stats={stats} />
                        <QueueSummary stats={stats} />
                    </InlineGrid>

                    <AttentionTable items={attention_items} />

                    <RecentActivity events={recent_events} />
                </BlockStack>
            </Page>
        </>
    );
}