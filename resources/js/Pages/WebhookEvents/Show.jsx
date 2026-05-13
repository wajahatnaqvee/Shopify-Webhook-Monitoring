import { Head, router } from '@inertiajs/react';
import {
    Page,
    Card,
    BlockStack,
    InlineStack,
    InlineGrid,
    Text,
    Badge,
    Button,
    IndexTable,
    Box,
    Divider,
    Collapsible,
    Banner,
    Modal
} from '@shopify/polaris';
import { useCallback, useEffect, useMemo, useState } from 'react';

const STATUS_TONE = {
    pending: 'attention',
    processing: 'info',
    success: 'success',
    failed: 'critical',
    ignored: 'subdued',
    replayed: 'warning',
};

const TRIGGER_LABEL = {
    automatic: 'Automatic',
    manual_replay: 'Manual replay',
};

function humanize(value) {
    if (!value) return '—';

    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
    if (!value) return '—';

    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

function formatDuration(value) {
    if (value == null) return '—';

    return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`;
}

function StatusBadge({ status }) {
    return (
        <Badge tone={STATUS_TONE[status] ?? 'subdued'}>
            {humanize(status)}
        </Badge>
    );
}

function DetailRow({ label, value }) {
    return (
        <InlineStack align="space-between" gap="400" wrap={false}>
            <Text as="span" variant="bodySm" tone="subdued">
                {label}
            </Text>

            <Text as="span" variant="bodySm" fontWeight="medium" alignment="end">
                {value ?? '—'}
            </Text>
        </InlineStack>
    );
}

function CompactMetric({ title, value, helper, tone = 'default' }) {
    const colors = {
        default: '#202223',
        success: '#008060',
        critical: '#D72C0D',
        warning: '#B98900',
        info: '#2C6ECB',
    };

    return (
        <Box background="bg-surface-secondary" padding="300" borderRadius="300">
            <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">
                    {title}
                </Text>

                <Text as="p" variant="headingMd" fontWeight="bold">
                    <span style={{ color: colors[tone] ?? colors.default }}>
                        {value ?? '—'}
                    </span>
                </Text>

                <Text as="p" variant="bodySm" tone="subdued">
                    {helper}
                </Text>
            </BlockStack>
        </Box>
    );
}

function JsonPanel({ title, description, data }) {
    const [open, setOpen] = useState(false);

    return (
        <Card>
            <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="050">
                        <Text as="h2" variant="headingSm">
                            {title}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                            {description}
                        </Text>
                    </BlockStack>

                    <Button size="slim" onClick={() => setOpen((value) => !value)}>
                        {open ? 'Hide' : 'Show'}
                    </Button>
                </InlineStack>

                <Collapsible
                    open={open}
                    id={`${title.replace(/\s+/g, '-').toLowerCase()}-json`}
                    transition={{ duration: '250ms', timingFunction: 'ease-in-out' }}
                    expandOnPrint
                >
                    <Box
                        background="bg-surface-secondary"
                        padding="300"
                        borderRadius="200"
                        overflowX="scroll"
                    >
                        <pre
                            style={{
                                margin: 0,
                                fontSize: 12,
                                lineHeight: 1.45,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                maxHeight: 420,
                                overflow: 'auto',
                            }}
                        >
                            {JSON.stringify(data ?? {}, null, 2)}
                        </pre>
                    </Box>
                </Collapsible>
            </BlockStack>
        </Card>
    );
}

function AttemptItem({ attempt }) {
    const isSuccess = attempt.status === 'success';
    const isFailed = attempt.status === 'failed';

    return (
        <Box background="bg-surface-secondary" padding="300" borderRadius="300">
            <InlineStack align="space-between" blockAlign="center" gap="400" wrap>
                <InlineStack gap="300" blockAlign="center" wrap={false}>
                    <div
                        style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: isSuccess ? '#E3F1DF' : isFailed ? '#FED3D1' : '#FFF1B8',
                            color: isSuccess ? '#008060' : isFailed ? '#D72C0D' : '#8A6116',
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 700,
                            flexShrink: 0,
                        }}
                    >
                        {isSuccess ? '✓' : isFailed ? '!' : '…'}
                    </div>

                    <BlockStack gap="050">
                        <InlineStack gap="200" blockAlign="center">
                            <Text as="p" variant="bodySm" fontWeight="semibold">
                                Attempt #{attempt.attempt_number}
                            </Text>
                            <StatusBadge status={attempt.status} />
                        </InlineStack>

                        <Text as="p" variant="bodySm" tone="subdued">
                            {TRIGGER_LABEL[attempt.trigger_type] ?? humanize(attempt.trigger_type)}
                        </Text>

                        {attempt.error_message && (
                            <Text as="p" variant="bodySm" tone="critical">
                                {attempt.error_message.length > 80
                                    ? `${attempt.error_message.slice(0, 80)}...`
                                    : attempt.error_message}
                            </Text>
                        )}
                    </BlockStack>
                </InlineStack>

                <BlockStack gap="050" inlineAlign="end">
                    <Text as="p" variant="bodySm" tone="subdued">
                        Started {formatDate(attempt.started_at)}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                        Finished {formatDate(attempt.finished_at)}
                    </Text>
                </BlockStack>
            </InlineStack>
        </Box>
    );
}

function ProcessingAttempts({ attempts = [] }) {
    const [modalOpen, setModalOpen] = useState(false);

    const latestAttempts = attempts.slice(0, 3);

    const failedCount = attempts.filter((attempt) => attempt.status === 'failed').length;
    const successCount = attempts.filter((attempt) => attempt.status === 'success').length;
    const manualReplayCount = attempts.filter((attempt) => attempt.trigger_type === 'manual_replay').length;

    const attemptRows = attempts.map((attempt, index) => (
        <IndexTable.Row id={String(attempt.id)} key={attempt.id} position={index}>
            <IndexTable.Cell>
                <Text as="span" fontWeight="semibold">
                    #{attempt.attempt_number}
                </Text>
            </IndexTable.Cell>

            <IndexTable.Cell>
                <StatusBadge status={attempt.status} />
            </IndexTable.Cell>

            <IndexTable.Cell>
                {TRIGGER_LABEL[attempt.trigger_type] ?? humanize(attempt.trigger_type)}
            </IndexTable.Cell>

            <IndexTable.Cell>
                {formatDate(attempt.started_at)}
            </IndexTable.Cell>

            <IndexTable.Cell>
                {formatDate(attempt.finished_at)}
            </IndexTable.Cell>

            <IndexTable.Cell>
                <Text as="span" tone={attempt.error_message ? 'critical' : 'subdued'}>
                    {attempt.error_message
                        ? attempt.error_message.length > 90
                            ? `${attempt.error_message.slice(0, 90)}...`
                            : attempt.error_message
                        : '—'}
                </Text>
            </IndexTable.Cell>
        </IndexTable.Row>
    ));

    return (
        <>
            <Card>
                <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="050">
                            <Text as="h2" variant="headingMd">
                                Processing attempts
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                                Showing the latest attempts. Open full history for all retries and manual replays.
                            </Text>
                        </BlockStack>

                        <InlineStack gap="200" blockAlign="center">
                            <Badge tone="info">
                                {attempts.length} attempt{attempts.length === 1 ? '' : 's'}
                            </Badge>

                            {attempts.length > 3 && (
                                <Button size="slim" onClick={() => setModalOpen(true)}>
                                    View all
                                </Button>
                            )}
                        </InlineStack>
                    </InlineStack>

                    <InlineGrid columns={{ xs: 1, sm: 3 }} gap="300">
                        <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                            <BlockStack gap="050">
                                <Text as="p" variant="bodySm" tone="subdued">
                                    Successful
                                </Text>
                                <Text as="p" variant="headingMd">
                                    {successCount}
                                </Text>
                            </BlockStack>
                        </Box>

                        <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                            <BlockStack gap="050">
                                <Text as="p" variant="bodySm" tone="subdued">
                                    Failed
                                </Text>
                                <Text as="p" variant="headingMd">
                                    {failedCount}
                                </Text>
                            </BlockStack>
                        </Box>

                        <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                            <BlockStack gap="050">
                                <Text as="p" variant="bodySm" tone="subdued">
                                    Manual replays
                                </Text>
                                <Text as="p" variant="headingMd">
                                    {manualReplayCount}
                                </Text>
                            </BlockStack>
                        </Box>
                    </InlineGrid>

                    {latestAttempts.length > 0 ? (
                        <BlockStack gap="200">
                            {latestAttempts.map((attempt) => (
                                <AttemptItem key={attempt.id} attempt={attempt} />
                            ))}
                        </BlockStack>
                    ) : (
                        <Text as="p" tone="subdued">
                            No processing attempts have been recorded yet.
                        </Text>
                    )}
                </BlockStack>
            </Card>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="All processing attempts"
                large
                secondaryActions={[
                    {
                        content: 'Close',
                        onAction: () => setModalOpen(false),
                    },
                ]}
            >
                <Modal.Section>
                    <BlockStack gap="300">
                        <InlineStack gap="200" wrap>
                            <Badge tone="info">
                                Total: {attempts.length}
                            </Badge>
                            <Badge tone="success">
                                Success: {successCount}
                            </Badge>
                            <Badge tone={failedCount > 0 ? 'critical' : 'success'}>
                                Failed: {failedCount}
                            </Badge>
                            <Badge tone="attention">
                                Manual replay: {manualReplayCount}
                            </Badge>
                        </InlineStack>

                        <Card padding="0">
                            <IndexTable
                                resourceName={{
                                    singular: 'attempt',
                                    plural: 'attempts',
                                }}
                                itemCount={attempts.length}
                                selectable={false}
                                headings={[
                                    { title: 'Attempt' },
                                    { title: 'Status' },
                                    { title: 'Trigger' },
                                    { title: 'Started' },
                                    { title: 'Finished' },
                                    { title: 'Error' },
                                ]}
                            >
                                {attemptRows}
                            </IndexTable>
                        </Card>
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </>
    );
}
function SummaryInfo({ label, value, helper, tone = 'default' }) {
    const colors = {
        default: '#202223',
        success: '#008060',
        critical: '#D72C0D',
        warning: '#B98900',
        info: '#2C6ECB',
    };

    return (
        <Box
            background="bg-surface-secondary"
            padding="300"
            borderRadius="300"
            minHeight="86px"
        >
            <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">
                    {label}
                </Text>

                <Text as="p" variant="bodyMd" fontWeight="semibold">
                    <span style={{ color: colors[tone] ?? colors.default }}>
                        {value ?? '—'}
                    </span>
                </Text>

                {helper && (
                    <Text as="p" variant="bodySm" tone="subdued">
                        {helper}
                    </Text>
                )}
            </BlockStack>
        </Box>
    );
}
function JobLogs({ logs = [] }) {
    const [modalOpen, setModalOpen] = useState(false);

    const latestJob = logs[0] ?? null;
    const failedJobs = logs.filter((job) => job.status === 'failed');
    const successJobs = logs.filter((job) => job.status === 'success');

    const averageDuration = logs.length
        ? Math.round(
            logs.reduce((total, job) => total + Number(job.duration_ms || 0), 0) / logs.length
        )
        : null;

    const latestError = failedJobs[0]?.error_message ?? null;

    const jobRows = logs.map((job, index) => (
        <IndexTable.Row id={String(job.id)} key={job.id} position={index}>
            <IndexTable.Cell>
                <BlockStack gap="050">
                    <Text as="span" variant="bodySm" fontWeight="semibold">
                        {job.job_name?.split('\\').pop() ?? job.job_name}
                    </Text>

                    {job.error_message && (
                        <Text as="span" variant="bodySm" tone="critical">
                            {job.error_message.length > 80
                                ? `${job.error_message.slice(0, 80)}...`
                                : job.error_message}
                        </Text>
                    )}
                </BlockStack>
            </IndexTable.Cell>

            <IndexTable.Cell>
                <StatusBadge status={job.status} />
            </IndexTable.Cell>

            <IndexTable.Cell>#{job.attempt}</IndexTable.Cell>

            <IndexTable.Cell>{formatDuration(job.duration_ms)}</IndexTable.Cell>

            <IndexTable.Cell>{job.exception_class ?? '—'}</IndexTable.Cell>

            <IndexTable.Cell>{formatDate(job.finished_at)}</IndexTable.Cell>
        </IndexTable.Row>
    ));

    return (
        <>
            <Card>
                <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                        <BlockStack gap="100">
                            <InlineStack gap="200" blockAlign="center">
                                <Text as="h2" variant="headingMd">
                                    Job processing
                                </Text>

                                <Badge tone={failedJobs.length > 0 ? 'critical' : 'success'}>
                                    {failedJobs.length > 0 ? `${failedJobs.length} failed` : 'Healthy'}
                                </Badge>
                            </InlineStack>

                            <Text as="p" variant="bodySm" tone="subdued">
                                Queue jobs created while processing this webhook event.
                            </Text>
                        </BlockStack>

                        {logs.length > 0 && (
                            <Button size="slim" onClick={() => setModalOpen(true)}>
                                View job history
                            </Button>
                        )}
                    </InlineStack>

                    <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="300">
                        <SummaryInfo
                            label="Latest job"
                            value={latestJob ? humanize(latestJob.status) : '—'}
                            helper={latestJob ? formatDate(latestJob.finished_at) : 'No job yet'}
                            tone={
                                latestJob?.status === 'failed'
                                    ? 'critical'
                                    : latestJob?.status === 'success'
                                        ? 'success'
                                        : 'default'
                            }
                        />

                        <SummaryInfo
                            label="Total jobs"
                            value={logs.length}
                            helper="Processing records"
                            tone="info"
                        />

                        <SummaryInfo
                            label="Failed jobs"
                            value={failedJobs.length}
                            helper={`${successJobs.length} successful`}
                            tone={failedJobs.length > 0 ? 'critical' : 'success'}
                        />

                        <SummaryInfo
                            label="Avg. duration"
                            value={formatDuration(averageDuration)}
                            helper="Average runtime"
                            tone="default"
                        />
                    </InlineGrid>

                    {latestError && (
                        <Box
                            background="bg-surface-critical"
                            padding="300"
                            borderRadius="200"
                        >
                            <BlockStack gap="100">
                                <Text as="p" variant="bodySm" fontWeight="semibold" tone="critical">
                                    Latest job error
                                </Text>

                                <Text as="p" variant="bodySm" tone="critical">
                                    {latestError.length > 130
                                        ? `${latestError.slice(0, 130)}...`
                                        : latestError}
                                </Text>
                            </BlockStack>
                        </Box>
                    )}

                    {logs.length === 0 && (
                        <Text as="p" tone="subdued">
                            No job logs have been recorded for this event yet.
                        </Text>
                    )}
                </BlockStack>
            </Card>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Job history"
                large
                secondaryActions={[
                    {
                        content: 'Close',
                        onAction: () => setModalOpen(false),
                    },
                ]}
            >
                <Modal.Section>
                    <BlockStack gap="300">
                        <InlineStack gap="200" wrap>
                            <Badge tone="info">
                                Total: {logs.length}
                            </Badge>

                            <Badge tone="success">
                                Success: {successJobs.length}
                            </Badge>

                            <Badge tone={failedJobs.length > 0 ? 'critical' : 'success'}>
                                Failed: {failedJobs.length}
                            </Badge>
                        </InlineStack>

                        <Card padding="0">
                            <IndexTable
                                resourceName={{
                                    singular: 'job log',
                                    plural: 'job logs',
                                }}
                                itemCount={logs.length}
                                selectable={false}
                                headings={[
                                    { title: 'Job' },
                                    { title: 'Status' },
                                    { title: 'Attempt' },
                                    { title: 'Duration' },
                                    { title: 'Exception' },
                                    { title: 'Finished' },
                                ]}
                            >
                                {jobRows}
                            </IndexTable>
                        </Card>
                    </BlockStack>
                </Modal.Section>
            </Modal>
        </>
    );
}

export default function Show({ event }) {
    const [refreshing, setRefreshing] = useState(false);
    const [replaying, setReplaying] = useState(false);

    const attemptLogs = event.attempt_logs ?? [];
    const jobLogs = event.job_logs ?? [];

    const latestAttempt = attemptLogs[0] ?? null;
    const latestJob = jobLogs[0] ?? null;

    const failedAttempts = useMemo(
        () => attemptLogs.filter((attempt) => attempt.status === 'failed').length,
        [attemptLogs]
    );

    const handleBack = useCallback(() => {
        router.visit(route('webhook-events.index'), {
            preserveScroll: true,
        });
    }, []);

    const refreshEvent = useCallback(() => {
        setRefreshing(true);

        router.reload({
            only: ['event', 'flash'],
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setRefreshing(false),
        });
    }, []);

    const handleReplay = useCallback(() => {
        setReplaying(true);

        router.post(
            route('webhook-events.replay', event.id),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => refreshEvent(),
                onFinish: () => setReplaying(false),
            }
        );
    }, [event.id, refreshEvent]);

    useEffect(() => {
        if (!['pending', 'processing'].includes(event.status)) {
            return;
        }

        const interval = setInterval(() => {
            router.reload({
                only: ['event'],
                preserveScroll: true,
                preserveState: true,
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [event.status]);

    return (
        <>
            <Head title={`Webhook Event #${event.id}`} />

            <Page
                title={`Webhook Event #${event.id}`}
                subtitle={`${event.topic} · ${event.group ?? '—'} · ${humanize(event.action)}`}
                backAction={{
                    content: 'Webhook Events',
                    onAction: handleBack,
                }}
                primaryAction={{
                    content: 'Replay Event',
                    loading: replaying,
                    disabled: replaying || event.status === 'processing',
                    onAction: handleReplay,
                }}
                secondaryActions={[
                    {
                        content: 'Refresh',
                        loading: refreshing,
                        disabled: refreshing,
                        onAction: refreshEvent,
                    },
                ]}
            >
                <BlockStack gap="400">
                    <Card>
                        <BlockStack gap="400">
                            <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                                <BlockStack gap="150">
                                    <InlineStack gap="200" blockAlign="center" wrap>
                                        <Text as="h2" variant="headingMd">
                                            Event summary
                                        </Text>

                                        <StatusBadge status={event.status} />
                                    </InlineStack>

                                    <Text as="p" variant="bodySm" tone="subdued">
                                        {event.topic} · Event #{event.id}
                                    </Text>
                                </BlockStack>

                                {/* <Button
                                    size="slim"
                                    onClick={refreshEvent}
                                    loading={refreshing}
                                    disabled={refreshing}
                                >
                                    Refresh status
                                </Button> */}
                            </InlineStack>

                            <InlineGrid columns={{ xs: 1, sm: 2, md: 5 }} gap="300">
                                <SummaryInfo
                                    label="Received"
                                    value={formatDate(event.received_at)}
                                />

                                <SummaryInfo
                                    label="Processed"
                                    value={formatDate(event.processed_at)}
                                />

                                <SummaryInfo
                                    label="Attempts"
                                    value={event.attempts_count ?? attemptLogs.length}
                                    helper={`${failedAttempts} failed`}
                                    tone={failedAttempts > 0 ? 'critical' : 'success'}
                                />

                                <SummaryInfo
                                    label="Latest trigger"
                                    value={
                                        latestAttempt
                                            ? (TRIGGER_LABEL[latestAttempt.trigger_type] ?? humanize(latestAttempt.trigger_type))
                                            : '—'
                                    }
                                    helper="Processing source"
                                    tone="info"
                                />

                                <SummaryInfo
                                    label="Last job"
                                    value={latestJob ? humanize(latestJob.status) : '—'}
                                    helper={latestJob ? formatDuration(latestJob.duration_ms) : 'No job yet'}
                                    tone={
                                        latestJob?.status === 'failed'
                                            ? 'critical'
                                            : latestJob?.status === 'success'
                                                ? 'success'
                                                : 'default'
                                    }
                                />
                            </InlineGrid>
                        </BlockStack>
                    </Card>

                    {event.error_message && (
                        <Banner tone="critical" title="Processing failed">
                            <Text as="p">
                                {event.error_message}
                            </Text>
                        </Banner>
                    )}

                    <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                        <Card>
                            <BlockStack gap="300">
                                <Text as="h2" variant="headingMd">
                                    Webhook details
                                </Text>

                                <Divider />

                                <BlockStack gap="200">
                                    <DetailRow label="Topic" value={event.topic} />
                                    <DetailRow label="Topic enum" value={event.topic_enum} />
                                    <DetailRow label="Group" value={event.group} />
                                    <DetailRow label="Action" value={humanize(event.action)} />
                                    <DetailRow label="API version" value={event.api_version} />
                                </BlockStack>
                            </BlockStack>
                        </Card>

                        <Card>
                            <BlockStack gap="300">
                                <Text as="h2" variant="headingMd">
                                    Delivery metadata
                                </Text>

                                <Divider />

                                <BlockStack gap="200">
                                    <DetailRow label="Webhook ID" value={event.webhook_id} />
                                    <DetailRow label="Shop" value={event.shop_domain} />
                                    <DetailRow label="Received at" value={formatDate(event.received_at)} />
                                    <DetailRow label="Processed at" value={formatDate(event.processed_at)} />
                                    <DetailRow label="Failed at" value={formatDate(event.failed_at)} />
                                </BlockStack>
                            </BlockStack>
                        </Card>
                    </InlineGrid>

                    <ProcessingAttempts attempts={attemptLogs} />

                    <JobLogs logs={jobLogs} />

                    <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                        <JsonPanel
                            title="Payload"
                            description="Raw Shopify webhook payload."
                            data={event.payload}
                        />

                        <JsonPanel
                            title="Headers"
                            description="HTTP headers for debugging."
                            data={event.headers}
                        />
                    </InlineGrid>
                </BlockStack>
            </Page>
        </>
    );
}