import { Head, Link, router } from '@inertiajs/react';
import {
    Page,
    Card,
    BlockStack,
    InlineStack,
    InlineGrid,
    Text,
    Badge,
    Button,
    Box,
    Divider,
    Collapsible,
    Banner,
    Modal,
    IndexTable,
    Tooltip,
} from '@shopify/polaris';
import { useCallback, useMemo, useState } from 'react';

import StatusBadge from '@/Components/Webhooks/StatusBadge';
import RelativeTime from '@/Components/Webhooks/RelativeTime';
import {
    humanize,
    formatDate,
    formatFullDate,
    formatMs,
    copyToClipboard,
} from '@/Components/Webhooks/utils';

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */

function safeText(value, fallback = '—') {
    if (value === null || value === undefined || value === '') return fallback;
    return value;
}

function getStatusTone(status) {
    if (status === 'success') return 'success';
    if (status === 'failed') return 'critical';
    if (status === 'pending' || status === 'processing') return 'attention';
    if (status === 'ignored') return 'info';

    return 'subdued';
}

function resourceTypeLabel(type) {
    if (type === 'product') return 'Product';
    if (type === 'order') return 'Order';
    if (type === 'customer') return 'Customer';
    if (type === 'inventory_item') return 'Inventory item';
    if (type === 'collection') return 'Collection';
    if (type === 'fulfillment') return 'Fulfillment';
    if (type === 'checkout') return 'Checkout';
    if (type === 'metaobject') return 'Metaobject';

    return humanize(type || 'Resource');
}

function getResourceTitle(event) {
    if (event?.resource_name) {
        return `${resourceTypeLabel(event.resource_type)}: ${event.resource_name}`;
    }

    if (event?.resource_identifier) {
        return `${resourceTypeLabel(event.resource_type)}: ${event.resource_identifier}`;
    }

    return resourceTypeLabel(event?.resource_type);
}

function getResourceSubtitle(event) {
    const parts = [];

    if (event?.resource_id) {
        parts.push(`ID: ${event.resource_id}`);
    }

    if (event?.resource_identifier) {
        parts.push(`Identifier: ${event.resource_identifier}`);
    }

    return parts.length > 0 ? parts.join(' · ') : 'No resource identifier available';
}

function getStatusIcon(status) {
    const isSuccess = status === 'success';
    const isFailed = status === 'failed';
    const isPending = status === 'pending' || status === 'processing';

    if (isFailed) {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                    d="M12 3.5L21 19.5H3L12 3.5Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                />
                <path
                    d="M12 8.5V13"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                />
                <path
                    d="M12 16.5H12.01"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />
            </svg>
        );
    }

    if (isSuccess) {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                    d="M12 3.5L19 6.5V11.8C19 16.2 16.1 19.6 12 20.7C7.9 19.6 5 16.2 5 11.8V6.5L12 3.5Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                />
                <path
                    d="M8.5 12.3L10.8 14.6L15.7 9.5"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }

    if (isPending) {
        return (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle
                    cx="12"
                    cy="12"
                    r="8.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                />
                <path
                    d="M12 7.5V12.4L15 14.2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }

    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
                d="M7 7H17"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <path
                d="M7 12H17"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <path
                d="M7 17H13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function StatusIconBox({ status, size = 46 }) {
    const tone = getStatusTone(status);

    const background =
        tone === 'critical'
            ? '#FED3D1'
            : tone === 'success'
                ? '#E3F1DF'
                : tone === 'attention'
                    ? '#FFF1B8'
                    : '#F1F2F4';

    const border =
        tone === 'critical'
            ? '#F5B7B1'
            : tone === 'success'
                ? '#AEE9D1'
                : tone === 'attention'
                    ? '#FFD873'
                    : '#E3E5E7';

    const color =
        tone === 'critical'
            ? '#D72C0D'
            : tone === 'success'
                ? '#008060'
                : tone === 'attention'
                    ? '#8A6116'
                    : '#5C5F62';

    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: 16,
                background,
                border: `1px solid ${border}`,
                color,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
            }}
        >
            {getStatusIcon(status)}
        </div>
    );
}

function TopicIcon({ group }) {
    const iconProps = {
        width: 20,
        height: 20,
        viewBox: '0 0 24 24',
        fill: 'none',
    };

    const iconStyle = {
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
    };

    const icons = {
        Products: (
            <svg {...iconProps}>
                <path {...iconStyle} d="M6.5 7.5L12 4.5L17.5 7.5V16.5L12 19.5L6.5 16.5V7.5Z" />
                <path {...iconStyle} d="M6.8 7.8L12 10.8L17.2 7.8" />
                <path {...iconStyle} d="M12 10.8V19" />
            </svg>
        ),
        Orders: (
            <svg {...iconProps}>
                <path {...iconStyle} d="M7 4.5H17L19 8V19.5H5V8L7 4.5Z" />
                <path {...iconStyle} d="M5 8H19" />
                <path {...iconStyle} d="M9 11.5H15" />
                <path {...iconStyle} d="M9 15H13" />
            </svg>
        ),
        Customers: (
            <svg {...iconProps}>
                <path {...iconStyle} d="M12 12.2C14.1 12.2 15.8 10.5 15.8 8.4C15.8 6.3 14.1 4.6 12 4.6C9.9 4.6 8.2 6.3 8.2 8.4C8.2 10.5 9.9 12.2 12 12.2Z" />
                <path {...iconStyle} d="M5.5 19.4C6.4 16.5 8.8 14.8 12 14.8C15.2 14.8 17.6 16.5 18.5 19.4" />
            </svg>
        ),
        Inventory: (
            <svg {...iconProps}>
                <path {...iconStyle} d="M4.8 7.2L12 3.8L19.2 7.2L12 10.7L4.8 7.2Z" />
                <path {...iconStyle} d="M5 11L12 14.4L19 11" />
                <path {...iconStyle} d="M5 15L12 18.4L19 15" />
            </svg>
        ),
        Collections: (
            <svg {...iconProps}>
                <path {...iconStyle} d="M7 4.5H17C18.1 4.5 19 5.4 19 6.5V17.5C19 18.6 18.1 19.5 17 19.5H7C5.9 19.5 5 18.6 5 17.5V6.5C5 5.4 5.9 4.5 7 4.5Z" />
                <path {...iconStyle} d="M5 9H19" />
                <path {...iconStyle} d="M5 14H19" />
            </svg>
        ),
        Fulfillment: (
            <svg {...iconProps}>
                <path {...iconStyle} d="M4.5 7.5H15.5V17.5H4.5V7.5Z" />
                <path {...iconStyle} d="M15.5 10.5H18.2L20 13.2V17.5H15.5V10.5Z" />
                <path {...iconStyle} d="M7.5 18.2C8.3 18.2 9 17.5 9 16.7C9 15.9 8.3 15.2 7.5 15.2C6.7 15.2 6 15.9 6 16.7C6 17.5 6.7 18.2 7.5 18.2Z" />
                <path {...iconStyle} d="M17.5 18.2C18.3 18.2 19 17.5 19 16.7C19 15.9 18.3 15.2 17.5 15.2C16.7 15.2 16 15.9 16 16.7C16 17.5 16.7 18.2 17.5 18.2Z" />
            </svg>
        ),
        Checkout: (
            <svg {...iconProps}>
                <path {...iconStyle} d="M6.5 7.5H19L17.5 14H8L6.5 7.5Z" />
                <path {...iconStyle} d="M6.5 7.5L6 5H4" />
                <path {...iconStyle} d="M9 18.5H9.01" />
                <path {...iconStyle} d="M16.5 18.5H16.51" />
                <path {...iconStyle} d="M9 11H16" />
            </svg>
        ),
        Metaobjects: (
            <svg {...iconProps}>
                <path {...iconStyle} d="M7 5H11V9H7V5Z" />
                <path {...iconStyle} d="M13 5H17V9H13V5Z" />
                <path {...iconStyle} d="M7 15H11V19H7V15Z" />
                <path {...iconStyle} d="M13 15H17V19H13V15Z" />
                <path {...iconStyle} d="M9 9V15" />
                <path {...iconStyle} d="M15 9V15" />
                <path {...iconStyle} d="M11 7H13" />
                <path {...iconStyle} d="M11 17H13" />
            </svg>
        ),
    };

    return (
        <div
            style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: '#F6F6F7',
                border: '1px solid #E3E5E7',
                display: 'grid',
                placeItems: 'center',
                color: '#303030',
                flexShrink: 0,
            }}
        >
            {icons[group] || icons.Metaobjects}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Small Components
───────────────────────────────────────────────────────────────────────────── */

function DetailRow({ label, value }) {
    return (
        <InlineStack align="space-between" blockAlign="start" gap="400" wrap={false}>
            <Text as="span" variant="bodySm" tone="subdued">
                {label}
            </Text>

            <Text as="span" variant="bodySm" fontWeight="medium" alignment="end">
                {value ?? '—'}
            </Text>
        </InlineStack>
    );
}

function SummaryInfo({ label, value, helper, tone = 'default' }) {
    const color =
        tone === 'critical'
            ? '#D72C0D'
            : tone === 'success'
                ? '#008060'
                : tone === 'warning'
                    ? '#8A6116'
                    : tone === 'info'
                        ? '#2C6ECB'
                        : '#202223';

    return (
        <Box background="bg-surface-secondary" padding="300" borderRadius="300" minHeight="88px">
            <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">
                    {label}
                </Text>

                <Text as="p" variant="bodyMd" fontWeight="semibold">
                    <span style={{ color }}>{safeText(value)}</span>
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

function JsonPanel({ title, description, data }) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        const ok = await copyToClipboard(JSON.stringify(data ?? {}, null, 2));

        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [data]);

    return (
        <Card>
            <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                    <BlockStack gap="050">
                        <Text as="h2" variant="headingSm">
                            {title}
                        </Text>

                        <Text as="p" variant="bodySm" tone="subdued">
                            {description}
                        </Text>
                    </BlockStack>

                    <InlineStack gap="200">
                        <Button size="slim" variant="plain" onClick={handleCopy}>
                            {copied ? 'Copied' : 'Copy'}
                        </Button>

                        <Button size="slim" onClick={() => setOpen((value) => !value)}>
                            {open ? 'Hide' : 'Show'}
                        </Button>
                    </InlineStack>
                </InlineStack>

                <Collapsible
                    open={open}
                    id={`${title.replace(/\s+/g, '-').toLowerCase()}-json`}
                    transition={{ duration: '250ms', timingFunction: 'ease-in-out' }}
                    expandOnPrint
                >
                    <Box background="bg-surface-secondary" padding="300" borderRadius="200" overflowX="scroll">
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

function EventSummaryCard({ event }) {
    const isFailed = event.status === 'failed';
    const isProcessing = event.status === 'pending' || event.status === 'processing';
    const isSuccess = event.status === 'success';

    return (
        <Card>
            <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                <InlineStack align="start" blockAlign="start" gap="400" wrap={false}>
                    <StatusIconBox status={event.status} size={54} />

                    <BlockStack gap="200">
                        <InlineStack gap="200" blockAlign="center" wrap>
                            <Text as="h2" variant="headingLg">
                                {isSuccess
                                    ? 'Webhook processed successfully'
                                    : isFailed
                                        ? 'Webhook processing failed'
                                        : isProcessing
                                            ? 'Webhook is processing'
                                            : 'Webhook received'}
                            </Text>

                            <StatusBadge status={event.status} />
                        </InlineStack>

                        <Text as="p" tone="subdued">
                            {isSuccess
                                ? 'Shopify delivered this webhook and the app processed it without errors.'
                                : isFailed
                                    ? 'The webhook was received, but processing failed. Review the error and replay when ready.'
                                    : isProcessing
                                        ? 'The webhook has been received and is waiting for processing or currently running.'
                                        : 'The webhook was received and stored by the app.'}
                        </Text>

                        <InlineStack gap="400" wrap>
                            <Text as="span" tone="subdued">
                                Topic: {event.topic}
                            </Text>

                            <Text as="span" tone="subdued">
                                Delivery ID: {event.id}
                            </Text>

                            <Text as="span" tone="subdued">
                                Received: <RelativeTime value={event.received_at} />
                            </Text>
                        </InlineStack>
                    </BlockStack>
                </InlineStack>
            </InlineStack>
        </Card>
    );
}

function ResourceCard({ event }) {
    const resourceTitle = getResourceTitle(event);
    const resourceSubtitle = getResourceSubtitle(event);

    return (
        <Card>
            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                    <InlineStack align="start" blockAlign="start" gap="300" wrap={false}>
                        <TopicIcon group={event.group} />

                        <BlockStack gap="100">
                            <Text as="h2" variant="headingMd">
                                Related resource
                            </Text>

                            <Text as="p" tone="subdued">
                                The Shopify object connected to this webhook event.
                            </Text>
                        </BlockStack>
                    </InlineStack>

                    <Badge tone="info">
                        {safeText(event.group, 'Webhook')}
                    </Badge>
                </InlineStack>

                <Box background="bg-surface-secondary" padding="400" borderRadius="300">
                    <BlockStack gap="200">
                        <Text as="p" variant="headingMd">
                            {resourceTitle}
                        </Text>

                        <Text as="p" tone="subdued">
                            {resourceSubtitle}
                        </Text>
                    </BlockStack>
                </Box>

                <BlockStack gap="200">
                    <DetailRow label="Resource type" value={resourceTypeLabel(event.resource_type)} />
                    <DetailRow label="Resource ID" value={event.resource_id} />
                    <DetailRow label="GraphQL ID" value={event.resource_gid} />
                    <DetailRow label="Identifier" value={event.resource_identifier} />
                </BlockStack>
            </BlockStack>
        </Card>
    );
}

function ProcessingCard({ event }) {
    return (
        <Card>
            <BlockStack gap="400">
                <InlineStack align="start" blockAlign="start" gap="300" wrap={false}>
                    <StatusIconBox status={event.status} />

                    <BlockStack gap="100">
                        <Text as="h2" variant="headingMd">
                            Processing overview
                        </Text>

                        <Text as="p" tone="subdued">
                            Processing status, attempts, and recovery information.
                        </Text>
                    </BlockStack>
                </InlineStack>

                <InlineGrid columns={{ xs: 1, sm: 2 }} gap="300">
                    <SummaryInfo
                        label="Attempts"
                        value={event.attempts ?? 0}
                        helper="Total processing tries"
                        tone="info"
                    />

                    <SummaryInfo
                        label="Last processed"
                        value={event.processed_at ? formatDate(event.processed_at) : 'Not processed yet'}
                        helper={event.processed_at ? 'Latest successful or failed attempt' : 'Waiting for worker'}
                        tone={event.processed_at ? 'success' : 'warning'}
                    />
                </InlineGrid>

                {event.error_message && (
                    <Banner tone="critical" title="Processing error">
                        <Text as="p">
                            {event.error_message}
                        </Text>
                    </Banner>
                )}
            </BlockStack>
        </Card>
    );
}

function AttemptTimeline({ attempts = [] }) {
    if (!attempts.length) {
        return (
            <Card>
                <BlockStack gap="200">
                    <Text as="h2" variant="headingMd">
                        Processing attempts
                    </Text>

                    <Box background="bg-surface-secondary" padding="400" borderRadius="300">
                        <Text as="p" tone="subdued">
                            No processing attempts have been recorded yet.
                        </Text>
                    </Box>
                </BlockStack>
            </Card>
        );
    }

    return (
        <Card>
            <BlockStack gap="400">
                <BlockStack gap="100">
                    <Text as="h2" variant="headingMd">
                        Processing attempts
                    </Text>

                    <Text as="p" tone="subdued">
                        A timeline of processing and replay attempts for this webhook.
                    </Text>
                </BlockStack>

                <BlockStack gap="300">
                    {attempts.map((attempt, index) => {
                        const isLast = index === attempts.length - 1;

                        return (
                            <InlineStack
                                key={attempt.id ?? index}
                                gap="300"
                                align="start"
                                blockAlign="start"
                                wrap={false}
                            >
                                <BlockStack gap="000" inlineAlign="center">
                                    <StatusIconBox status={attempt.status} size={32} />

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
                                    background="bg-surface-secondary"
                                    padding="300"
                                    borderRadius="300"
                                    width="100%"
                                >
                                    <InlineStack align="space-between" blockAlign="start" gap="300" wrap>
                                        <BlockStack gap="100">
                                            <InlineStack gap="200" blockAlign="center" wrap>
                                                <Text as="p" fontWeight="semibold">
                                                    Attempt #{attempt.attempt_number ?? index + 1}
                                                </Text>

                                                <StatusBadge status={attempt.status} />
                                            </InlineStack>

                                            {attempt.triggered_by && (
                                                <Text as="p" variant="bodySm" tone="subdued">
                                                    Triggered by {humanize(attempt.triggered_by)}
                                                </Text>
                                            )}

                                            {attempt.error_message && (
                                                <Text as="p" variant="bodySm" tone="critical">
                                                    {attempt.error_message}
                                                </Text>
                                            )}
                                        </BlockStack>

                                        <BlockStack gap="050" inlineAlign="end">
                                            <Text as="span" variant="bodySm" tone="subdued">
                                                {attempt.started_at ? formatDate(attempt.started_at) : '—'}
                                            </Text>

                                            {attempt.duration_ms !== undefined && (
                                                <Text as="span" variant="bodySm" tone="subdued">
                                                    {formatMs(attempt.duration_ms)}
                                                </Text>
                                            )}
                                        </BlockStack>
                                    </InlineStack>
                                </Box>
                            </InlineStack>
                        );
                    })}
                </BlockStack>
            </BlockStack>
        </Card>
    );
}

function RelatedEvents({ events = [] }) {
    if (!events.length) {
        return null;
    }

    return (
        <Card padding="0">
            <Box padding="400">
                <BlockStack gap="100">
                    <Text as="h2" variant="headingMd">
                        Related events
                    </Text>

                    <Text as="p" tone="subdued">
                        Other webhook deliveries connected to the same resource.
                    </Text>
                </BlockStack>
            </Box>

            <Divider />

            <IndexTable
                resourceName={{
                    singular: 'related event',
                    plural: 'related events',
                }}
                itemCount={events.length}
                headings={[
                    { title: 'Event' },
                    { title: 'Status' },
                    { title: 'Received' },
                    { title: 'Action' },
                ]}
                selectable={false}
            >
                {events.map((related, index) => (
                    <IndexTable.Row
                        id={String(related.id)}
                        key={related.id}
                        position={index}
                    >
                        <IndexTable.Cell>
                            <BlockStack gap="050">
                                <Text as="span" fontWeight="semibold">
                                    {related.topic}
                                </Text>

                                <Text as="span" variant="bodySm" tone="subdued">
                                    {related.group ?? 'Webhook'} · {related.action ?? 'event'} · Delivery ID: {related.id}
                                </Text>
                            </BlockStack>
                        </IndexTable.Cell>

                        <IndexTable.Cell>
                            <StatusBadge status={related.status} />
                        </IndexTable.Cell>

                        <IndexTable.Cell>
                            <RelativeTime value={related.received_at} />
                        </IndexTable.Cell>

                        <IndexTable.Cell>
                            <Link href={route('webhook-events.show', related.id)}>
                                View
                            </Link>
                        </IndexTable.Cell>
                    </IndexTable.Row>
                ))}
            </IndexTable>
        </Card>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────────────────── */

export default function Show({
    event,
    attempts = [],
    job_logs = [],
    related_events = [],
}) {
    const [replayModalOpen, setReplayModalOpen] = useState(false);
    const [replaying, setReplaying] = useState(false);

    const canReplay = event?.status === 'failed' || event?.status === 'ignored' || event?.status === 'success';

    const latestJobLog = useMemo(() => {
        if (!Array.isArray(job_logs) || job_logs.length === 0) return null;
        return job_logs[0];
    }, [job_logs]);

    const handleReplay = useCallback(() => {
        if (!event?.id) return;

        setReplaying(true);

        router.post(
            route('webhook-events.replay', event.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setReplaying(false);
                    setReplayModalOpen(false);
                },
            }
        );
    }, [event?.id]);

    return (
        <>
            <Head title={`Webhook Event #${event?.id}`} />

            <Modal
                open={replayModalOpen}
                onClose={() => !replaying && setReplayModalOpen(false)}
                title="Replay webhook event?"
                primaryAction={{
                    content: 'Replay event',
                    loading: replaying,
                    onAction: handleReplay,
                }}
                secondaryActions={[
                    {
                        content: 'Cancel',
                        disabled: replaying,
                        onAction: () => setReplayModalOpen(false),
                    },
                ]}
            >
                <Modal.Section>
                    <BlockStack gap="200">
                        <Text as="p">
                            This will reprocess the same stored webhook payload and create a new processing attempt.
                        </Text>

                        <Text as="p" tone="subdued">
                            It will not ask Shopify to send a new webhook delivery.
                        </Text>
                    </BlockStack>
                </Modal.Section>
            </Modal>

            <Page
                title={`Webhook Event #${event?.id}`}
                subtitle="Review delivery status, resource context, and processing history."
                backAction={{
                    content: 'Webhook Events',
                    onAction: () => router.visit(route('webhook-events.index')),
                }}
                primaryAction={
                    canReplay
                        ? {
                            content: 'Replay event',
                            loading: replaying,
                            onAction: () => setReplayModalOpen(true),
                        }
                        : undefined
                }
                secondaryActions={[
                    {
                        content: 'Refresh',
                        onAction: () => router.reload({ preserveScroll: true }),
                    },
                ]}
            >
                <BlockStack gap="500">
                    <EventSummaryCard event={event} />

                    {event?.topic === 'checkouts/update' && (
                        <Banner tone="info">
                            <Text as="p">
                                Checkout update events may appear multiple times during one customer checkout session.
                            </Text>
                        </Banner>
                    )}

                    <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
                        <ResourceCard event={event} />
                        <ProcessingCard event={event} />
                    </InlineGrid>

                    {latestJobLog && (
                        <Card>
                            <BlockStack gap="400">
                                <InlineStack align="start" blockAlign="start" gap="300" wrap={false}>
                                    <StatusIconBox status={latestJobLog.status} />

                                    <BlockStack gap="100">
                                        <Text as="h2" variant="headingMd">
                                            Latest job run
                                        </Text>

                                        <Text as="p" tone="subdued">
                                            Most recent background processing job for this event.
                                        </Text>
                                    </BlockStack>
                                </InlineStack>

                                <InlineGrid columns={{ xs: 1, sm: 3 }} gap="300">
                                    <SummaryInfo
                                        label="Status"
                                        value={humanize(latestJobLog.status)}
                                        tone={latestJobLog.status === 'success' ? 'success' : latestJobLog.status === 'failed' ? 'critical' : 'warning'}
                                    />

                                    <SummaryInfo
                                        label="Duration"
                                        value={formatMs(latestJobLog.duration_ms)}
                                        helper="Processing time"
                                        tone="info"
                                    />

                                    <SummaryInfo
                                        label="Completed"
                                        value={latestJobLog.completed_at ? formatDate(latestJobLog.completed_at) : '—'}
                                    />
                                </InlineGrid>

                                {latestJobLog.error_message && (
                                    <Banner tone="critical" title="Job error">
                                        <Text as="p">
                                            {latestJobLog.error_message}
                                        </Text>
                                    </Banner>
                                )}
                            </BlockStack>
                        </Card>
                    )}

                    <AttemptTimeline attempts={attempts} />

                    <RelatedEvents events={related_events} />

                    <Card>
                        <BlockStack gap="400">
                            <InlineStack align="start" blockAlign="start" gap="300" wrap={false}>
                                <TopicIcon group={event.group} />

                                <BlockStack gap="100">
                                    <Text as="h2" variant="headingMd">
                                        Technical details
                                    </Text>

                                    <Text as="p" tone="subdued">
                                        Advanced data for developers and debugging. Hidden by default to keep the page simple.
                                    </Text>
                                </BlockStack>
                            </InlineStack>

                            <InlineGrid columns={{ xs: 1, sm: 2 }} gap="300">
                                <DetailRow label="Shop domain" value={event.shop_domain} />
                                <DetailRow label="Webhook ID" value={event.webhook_id} />
                                <DetailRow label="API version" value={event.api_version} />
                                <DetailRow label="Received at" value={event.received_at ? formatFullDate(event.received_at) : '—'} />
                            </InlineGrid>
                        </BlockStack>
                    </Card>

                    <JsonPanel
                        title="Webhook payload"
                        description="Raw Shopify webhook payload. Use this only when debugging the event."
                        data={event.payload}
                    />

                    <JsonPanel
                        title="Headers"
                        description="Request headers received from Shopify."
                        data={event.headers}
                    />
                </BlockStack>
            </Page>
        </>
    );
}