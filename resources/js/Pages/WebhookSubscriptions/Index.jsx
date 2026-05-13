import { useState, useCallback, useEffect, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Page,
    Layout,
    Card,
    BlockStack,
    InlineStack,
    InlineGrid,
    Text,
    Badge,
    Button,
    IndexTable,
    Tabs,
    EmptyState,
    Tooltip,
    Box,
    Toast,
    Frame,
    Modal,
    Banner,
} from '@shopify/polaris';

// -- Status helpers ----------------------------------------------------------

const STATUS_TONE = {
    active: 'success',
    inactive: 'attention',
    failed: 'critical',
    deleted: 'subdued',
    missing_on_shopify: 'warning',
    unsupported: 'subdued',
};

function humanize(value) {
    if (!value) return '-';

    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
    if (!value) return '—';

    return new Date(value).toLocaleString(undefined, {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
         hour12: true,
    });
}

function shortEndpoint(url) {
    if (!url) return '—';

    try {
        const parsed = new URL(url);
        return `...${parsed.pathname}`;
    } catch {
        return url.length > 38 ? `...${url.slice(-38)}` : url;
    }
}

function getSubscriptionStatus(topic, subscription) {
    if (!topic.supported) return 'unsupported';
    if (!subscription) return 'inactive';

    return subscription.status || 'inactive';
}

function StatusBadge({ topic, subscription }) {
    const status = getSubscriptionStatus(topic, subscription);
    const tone = STATUS_TONE[status] ?? 'attention';

    return <Badge tone={tone}>{humanize(status)}</Badge>;
}

function StatCard({ title, value, helper, tone = 'default' }) {
    const colors = {
        default: '#202223',
        success: '#008060',
        attention: '#B98900',
        critical: '#D72C0D',
        subdued: '#6D7175',
    };

    return (
        <Card>
            <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">
                    {title}
                </Text>

                <Text as="p" variant="headingLg" fontWeight="bold">
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

// -- Tab definitions ---------------------------------------------------------

const TABS = [
    { id: 'all', content: 'All', panelID: 'panel-all' },
    { id: 'products', content: 'Products', panelID: 'panel-products' },
    { id: 'orders', content: 'Orders', panelID: 'panel-orders' },
];

const TAB_GROUPS = [null, 'Products', 'Orders'];

// -- Main component ----------------------------------------------------------

export default function Index({ topics = [], subscriptions = {} }) {
    const { flash } = usePage().props;
    const [registeringRecommended, setRegisteringRecommended] = useState(false);
    const [recommendedSummary, setRecommendedSummary] = useState(null);
    const [selectedTab, setSelectedTab] = useState(0);
    const handleTabChange = useCallback((index) => setSelectedTab(index), []);

    const [registering, setRegistering] = useState(null);

    // -- Delete confirmation modal state ------------------------------------

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const openDeleteModal = useCallback((sub) => setDeleteTarget(sub), []);

    const closeDeleteModal = useCallback(() => {
        if (!deleting) {
            setDeleteTarget(null);
        }
    }, [deleting]);

    const handleDelete = useCallback(() => {
        if (!deleteTarget) return;

        setDeleting(true);

        router.delete(route('webhook-subscriptions.destroy', deleteTarget.id), {
            preserveScroll: true,
            onFinish: () => {
                setDeleting(false);
                setDeleteTarget(null);
            },
        });
    }, [deleteTarget]);

    // -- Sync state ----------------------------------------------------------

    const [syncing, setSyncing] = useState(false);
    const [syncSummary, setSyncSummary] = useState(null);

    const handleSync = useCallback(() => {
        setSyncing(true);
        setSyncSummary(null);

        router.post(
            route('webhook-subscriptions.sync'),
            {},
            {
                preserveScroll: true,
                onFinish: () => setSyncing(false),
            }
        );
    }, []);

    // -- Toast state ---------------------------------------------------------

    const [toast, setToast] = useState({
        active: false,
        message: '',
        isError: false,
    });

    const dismissToast = useCallback(() => {
        setToast((current) => ({ ...current, active: false }));
    }, []);

    useEffect(() => {
        if (flash?.success) {
            setToast({ active: true, message: flash.success, isError: false });
        } else if (flash?.error) {
            setToast({ active: true, message: flash.error, isError: true });
        } else if (flash?.info) {
            setToast({ active: true, message: flash.info, isError: false });
        }

        if (flash?.sync_summary) {
            setSyncSummary(flash.sync_summary);
        }

        if (flash?.recommended_summary) {
            setRecommendedSummary(flash.recommended_summary);
        }
    }, [
        flash?.success,
        flash?.error,
        flash?.info,
        flash?.sync_summary,
        flash?.recommended_summary,
    ]);

    const handleRegisterRecommended = useCallback(() => {
        setRegisteringRecommended(true);
        setRecommendedSummary(null);

        router.post(
            route('webhook-subscriptions.register-recommended'),
            {},
            {
                preserveScroll: true,
                onFinish: () => setRegisteringRecommended(false),
            }
        );
    }, []);
    // -- Register ------------------------------------------------------------

    const handleRegister = useCallback((topicEnum) => {
        setRegistering(topicEnum);

        router.post(
            route('webhook-subscriptions.register'),
            { topic_enum: topicEnum },
            {
                preserveScroll: true,
                onFinish: () => setRegistering(null),
            }
        );
    }, []);

    // -- Derived data --------------------------------------------------------

    const group = TAB_GROUPS[selectedTab];

    const filteredTopics = group
        ? topics.filter((topic) => topic.group === group)
        : topics;

    const stats = useMemo(() => {
        let active = 0;
        let inactive = 0;
        let needsAttention = 0;
        let unsupported = 0;
        let latestSyncedAt = null;

        topics.forEach((topic) => {
            const sub = subscriptions?.[topic.topic_enum] ?? null;
            const status = getSubscriptionStatus(topic, sub);

            if (status === 'active') active += 1;
            if (status === 'inactive') inactive += 1;
            if (status === 'unsupported') unsupported += 1;

            if (['failed', 'missing_on_shopify'].includes(status)) {
                needsAttention += 1;
            }

            if (sub?.last_synced_at) {
                const current = new Date(sub.last_synced_at);

                if (!latestSyncedAt || current > new Date(latestSyncedAt)) {
                    latestSyncedAt = sub.last_synced_at;
                }
            }
        });

        return {
            active,
            inactive,
            needsAttention,
            unsupported,
            latestSyncedAt,
        };
    }, [topics, subscriptions]);

    const resourceName = {
        singular: 'webhook topic',
        plural: 'webhook topics',
    };

    const headings = [
        { title: 'Webhook' },
        { title: 'Status' },
        { title: 'Last Synced' },
        { title: 'Actions' },
    ];

    const rowMarkup = filteredTopics.map((topic, index) => {
        const sub = subscriptions?.[topic.topic_enum] ?? null;

        const status = getSubscriptionStatus(topic, sub);
        const isUnsupported = status === 'unsupported';
        const isActive = status === 'active';
        const isMissing = status === 'missing_on_shopify';
        const isLoading = registering === topic.topic_enum;

        const canDelete = isActive && !!sub?.shopify_subscription_id && !deleting;
        const canRegister = !isUnsupported && !isActive && !isLoading;

        let registerTooltip = null;

        if (isUnsupported) {
            registerTooltip = topic.unsupported_reason ?? 'This topic is not supported by Shopify for this API version.';
        } else if (isActive) {
            registerTooltip = 'This webhook is already active.';
        } else if (isMissing) {
            registerTooltip = 'This webhook exists locally but was not found on Shopify. Register again to re-create it.';
        }

        const registerButton = (
            <Button
                size="slim"
                variant={isActive ? 'secondary' : 'primary'}
                loading={isLoading}
                disabled={!canRegister}
                onClick={() => canRegister && handleRegister(topic.topic_enum)}
            >
                {isActive ? 'Registered' : isMissing ? 'Re-register' : 'Register'}
            </Button>
        );

        return (
            <IndexTable.Row
                id={topic.topic_enum}
                key={topic.topic_enum}
                position={index}
            >
                <IndexTable.Cell>
                    <BlockStack gap="100">
                        <InlineStack gap="200" blockAlign="center" wrap>
                            <Text as="span" variant="bodyMd" fontWeight="semibold">
                                {topic.title}
                            </Text>

                            {isUnsupported && (
                                <Badge tone="subdued">Unsupported</Badge>
                            )}
                        </InlineStack>

                        <Text as="span" variant="bodySm" tone="subdued">
                            {topic.topic_header || topic.topic} · {topic.topic_enum} · {topic.required_scope}
                        </Text>

                        <Text as="span" variant="bodySm" tone="subdued">
                            {topic.description}
                        </Text>

                        {isUnsupported && topic.unsupported_reason && (
                            <Text as="span" variant="bodySm" tone="caution">
                                {topic.unsupported_reason}
                            </Text>
                        )}

                        {isMissing && (
                            <Text as="span" variant="bodySm" tone="caution">
                                Exists locally but was not found on Shopify.
                            </Text>
                        )}
                    </BlockStack>
                </IndexTable.Cell>

                <IndexTable.Cell>
                    <StatusBadge topic={topic} subscription={sub} />
                </IndexTable.Cell>

                {/* <IndexTable.Cell>
                    <BlockStack gap="050">
                        <Text as="span" variant="bodySm" tone="subdued">
                            {shortEndpoint(sub?.endpoint_url)}
                        </Text>

                        {sub?.endpoint_url && (
                            <Text as="span" variant="bodySm" tone="subdued">
                                {new URL(sub.endpoint_url).hostname}
                            </Text>
                        )}
                    </BlockStack>
                </IndexTable.Cell> */}

                <IndexTable.Cell>
                    <Text as="span" variant="bodyMd" tone="subdued">
                        {formatDate(sub?.last_synced_at)}
                    </Text>
                </IndexTable.Cell>

                <IndexTable.Cell>
                    <InlineStack gap="200" wrap={false}>
                        {!isActive && (
                            registerTooltip ? (
                                <Tooltip content={registerTooltip}>
                                    <span>{registerButton}</span>
                                </Tooltip>
                            ) : (
                                registerButton
                            )
                        )}

                        {isActive && (
                            <Button
                                size="slim"
                                tone="critical"
                                variant="plain"
                                disabled={!canDelete}
                                onClick={() => canDelete && openDeleteModal({
                                    id: sub.id,
                                    title: topic.title,
                                })}
                            >
                                Delete
                            </Button>
                        )}

                        <Button
                            size="slim"
                            disabled={!isActive}
                            onClick={() => {
                                router.visit(route('webhook-events.index'), {
                                    data: {
                                        topic: topic.topic_header || topic.topic,
                                    },
                                });
                            }}
                        >
                            Events
                        </Button>
                    </InlineStack>
                </IndexTable.Cell>
            </IndexTable.Row>
        );
    });

    return (
        <>
            <Head title="Webhook Subscriptions" />

            <Frame>
                {toast.active && (
                    <Toast
                        content={toast.message}
                        error={toast.isError}
                        onDismiss={dismissToast}
                    />
                )}

                <Modal
                    open={!!deleteTarget}
                    onClose={closeDeleteModal}
                    title="Delete webhook subscription?"
                    primaryAction={{
                        content: 'Delete webhook',
                        destructive: true,
                        loading: deleting,
                        onAction: handleDelete,
                    }}
                    secondaryActions={[
                        {
                            content: 'Cancel',
                            disabled: deleting,
                            onAction: closeDeleteModal,
                        },
                    ]}
                >
                    <Modal.Section>
                        <Text as="p" variant="bodyMd">
                            Shopify will stop sending the{' '}
                            <strong>{deleteTarget?.title}</strong> webhook event
                            to your app endpoint. Existing webhook logs will not be deleted.
                        </Text>
                    </Modal.Section>
                </Modal>

                <Page
                    title="Webhook Subscriptions"
                    subtitle="Manage Shopify webhook subscriptions for this shop."
                    primaryAction={{
                        content: 'Register Recommended Webhooks',
                        loading: registeringRecommended,
                        disabled: registeringRecommended,
                        onAction: handleRegisterRecommended,
                    }}
                    secondaryActions={[
                        {
                            content: 'Sync from Shopify',
                            loading: syncing,
                            disabled: syncing,
                            onAction: handleSync,
                        },
                    ]}
                >
                    <Layout>
                        {syncSummary && (
                            <Layout.Section>
                                <Banner
                                    title="Sync completed"
                                    tone={syncSummary.failed > 0 ? 'warning' : 'success'}
                                    onDismiss={() => setSyncSummary(null)}
                                >
                                    <BlockStack gap="100">
                                        <Text as="p" variant="bodyMd">
                                            Shopify subscriptions checked. Created{' '}
                                            <strong>{syncSummary.created}</strong>, updated{' '}
                                            <strong>{syncSummary.updated}</strong>, missing{' '}
                                            <strong>{syncSummary.missing}</strong>, skipped{' '}
                                            <strong>{syncSummary.skipped}</strong>.
                                        </Text>

                                        {syncSummary.failed > 0 && (
                                            <Text as="p" variant="bodyMd" tone="critical">
                                                Failed: <strong>{syncSummary.failed}</strong>
                                            </Text>
                                        )}

                                        {syncSummary.errors?.length > 0 && (
                                            <BlockStack gap="050">
                                                {syncSummary.errors.map((error, index) => (
                                                    <Text
                                                        key={index}
                                                        as="p"
                                                        variant="bodySm"
                                                        tone="critical"
                                                    >
                                                        {error}
                                                    </Text>
                                                ))}
                                            </BlockStack>
                                        )}
                                    </BlockStack>
                                </Banner>
                            </Layout.Section>
                        )}
                        {recommendedSummary && (
                            <Layout.Section>
                                <Banner
                                    title="Recommended webhooks checked"
                                    tone={recommendedSummary.failed > 0 ? 'warning' : 'success'}
                                    onDismiss={() => setRecommendedSummary(null)}
                                >
                                    <BlockStack gap="100">
                                        <Text as="p" variant="bodyMd">
                                            Total recommended: <strong>{recommendedSummary.total_recommended}</strong>
                                        </Text>

                                        <Text as="p" variant="bodyMd">
                                            Registered: <strong>{recommendedSummary.registered}</strong>
                                        </Text>

                                        <Text as="p" variant="bodyMd">
                                            Already active: <strong>{recommendedSummary.already_active}</strong>
                                        </Text>

                                        <Text as="p" variant="bodyMd">
                                            Unsupported: <strong>{recommendedSummary.unsupported}</strong>
                                        </Text>

                                        <Text as="p" variant="bodyMd">
                                            Skipped: <strong>{recommendedSummary.skipped}</strong>
                                        </Text>

                                        {recommendedSummary.failed > 0 && (
                                            <Text as="p" variant="bodyMd" tone="critical">
                                                Failed: <strong>{recommendedSummary.failed}</strong>
                                            </Text>
                                        )}

                                        {recommendedSummary.errors?.length > 0 && (
                                            <BlockStack gap="050">
                                                {recommendedSummary.errors.map((error, index) => (
                                                    <Text
                                                        key={index}
                                                        as="p"
                                                        variant="bodySm"
                                                        tone="critical"
                                                    >
                                                        {error}
                                                    </Text>
                                                ))}
                                            </BlockStack>
                                        )}
                                    </BlockStack>
                                </Banner>
                            </Layout.Section>
                        )}
                        <Layout.Section>
                            <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
                                <StatCard
                                    title="Active Webhooks"
                                    value={stats.active}
                                    helper="Currently registered in Shopify"
                                    tone="success"
                                />

                                <StatCard
                                    title="Inactive Webhooks"
                                    value={stats.inactive}
                                    helper="Available to register"
                                    tone={stats.inactive > 0 ? 'attention' : 'subdued'}
                                />

                                <StatCard
                                    title="Needs Attention"
                                    value={stats.needsAttention}
                                    helper="Failed or missing on Shopify"
                                    tone={stats.needsAttention > 0 ? 'critical' : 'success'}
                                />

                                <StatCard
                                    title="Last Synced"
                                    value={stats.latestSyncedAt ? formatDate(stats.latestSyncedAt) : '—'}
                                    helper="Latest Shopify sync time"
                                    tone="default"
                                />
                            </InlineGrid>
                        </Layout.Section>

                        <Layout.Section>
                            <Card padding="0">
                                <Tabs
                                    tabs={TABS}
                                    selected={selectedTab}
                                    onSelect={handleTabChange}
                                />

                                {filteredTopics.length > 0 ? (
                                    <IndexTable
                                        resourceName={resourceName}
                                        itemCount={filteredTopics.length}
                                        headings={headings}
                                        selectable={false}
                                    >
                                        {rowMarkup}
                                    </IndexTable>
                                ) : (
                                    <Box padding="600">
                                        <EmptyState
                                            heading="No webhook topics found"
                                            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                        >
                                            <Text as="p" variant="bodyMd" tone="subdued">
                                                No webhook topics are defined for this category yet.
                                            </Text>
                                        </EmptyState>
                                    </Box>
                                )}
                            </Card>
                        </Layout.Section>
                    </Layout>
                </Page>
            </Frame>
        </>
    );
}