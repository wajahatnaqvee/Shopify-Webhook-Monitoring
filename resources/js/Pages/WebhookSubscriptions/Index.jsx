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
    Select,
    ChoiceList,
    Divider,
    ProgressBar,
} from '@shopify/polaris';

import RelativeTime from '@/Components/Webhooks/RelativeTime';
import { humanize, timeAgo, SUBSCRIPTION_STATUS_TONES } from '@/Components/Webhooks/utils';

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */

function getSubscriptionStatus(topic, subscription) {
    if (!topic.supported) return 'unsupported';
    if (!subscription) return 'inactive';

    return subscription.status || 'inactive';
}

function getStatusTone(status) {
    return SUBSCRIPTION_STATUS_TONES[status] ?? 'attention';
}

function SubscriptionStatusBadge({ topic, subscription }) {
    const status = getSubscriptionStatus(topic, subscription);

    return <Badge tone={getStatusTone(status)}>{humanize(status)}</Badge>;
}

function TopicGroupIcon({ group }) {
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

function StatusIcon({ tone = 'subdued' }) {
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
                width: 38,
                height: 38,
                borderRadius: 12,
                background,
                border: `1px solid ${border}`,
                color,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
            }}
        >
            {tone === 'critical' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3.5L21 19.5H3L12 3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M12 8.5V13" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                    <path d="M12 16.5H12.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
            ) : tone === 'success' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3.5L19 6.5V11.8C19 16.2 16.1 19.6 12 20.7C7.9 19.6 5 16.2 5 11.8V6.5L12 3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    <path d="M8.5 12.3L10.8 14.6L15.7 9.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ) : tone === 'attention' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
                    <path d="M12 7.5V12.4L15 14.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M7 7H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M7 12H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M7 17H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
            )}
        </div>
    );
}

function StatusIndicator({ status }) {
    const isActive = status === 'active';
    const isCritical = ['failed', 'missing_on_shopify', 'needs_attention'].includes(status);
    const isUnsupported = status === 'unsupported';

    const tone = isCritical ? 'critical' : isActive ? 'success' : isUnsupported ? 'subdued' : 'attention';

    return <StatusIcon tone={tone} />;
}

function SummaryCard({ title, value, helper, tone = 'subdued' }) {
    return (
        <Card>
            <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="start" gap="300">
                    <BlockStack gap="100">
                        <Text as="p" variant="bodySm" tone="subdued">
                            {title}
                        </Text>

                        <Text as="p" variant="headingXl" tone={tone === 'critical' ? 'critical' : undefined}>
                            {value}
                        </Text>
                    </BlockStack>

                    <StatusIcon tone={tone} />
                </InlineStack>

                <Text as="p" variant="bodySm" tone="subdued">
                    {helper}
                </Text>
            </BlockStack>
        </Card>
    );
}

function ActionBanner({ stats }) {
    const healthy = stats.needsAttention === 0;

    return (
        <Card>
            <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                <InlineStack gap="400" align="start" blockAlign="start" wrap={false}>
                    <div
                        style={{
                            width: 52,
                            height: 52,
                            borderRadius: 16,
                            background: healthy ? '#E3F1DF' : '#FED3D1',
                            color: healthy ? '#008060' : '#D72C0D',
                            border: healthy ? '1px solid #AEE9D1' : '1px solid #F5B7B1',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                        }}
                    >
                        {healthy ? (
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                <path d="M12 3.25L19 6.25V11.5C19 16.1 16.05 19.65 12 20.75C7.95 19.65 5 16.1 5 11.5V6.25L12 3.25Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                                <path d="M8.75 12.15L11.1 14.5L15.5 9.75" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        ) : (
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                <path d="M12 3.25L21.25 19.25H2.75L12 3.25Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                                <path d="M12 9V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                <path d="M12 16.5H12.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                            </svg>
                        )}
                    </div>

                    <BlockStack gap="150">
                        <InlineStack gap="200" blockAlign="center" wrap>
                            <Text as="h2" variant="headingLg">
                                {healthy ? 'Webhook coverage is ready' : 'Webhook subscriptions need review'}
                            </Text>

                            <Badge tone={healthy ? 'success' : 'critical'}>
                                {healthy ? 'Healthy' : 'Needs review'}
                            </Badge>
                        </InlineStack>

                        <Text as="p" tone="subdued">
                            {healthy
                                ? 'Manage, sync, and monitor Shopify webhook subscriptions for this store from one place.'
                                : 'Some subscriptions are failed or missing on Shopify. Sync from Shopify or re-register missing webhooks.'}
                        </Text>

                        <InlineStack gap="400" wrap>
                            <Text as="span" tone="subdued">
                                {stats.active} active
                            </Text>

                            <Text as="span" tone="subdued">
                                {stats.inactive} available
                            </Text>

                            <Text as="span" tone={stats.needsAttention > 0 ? 'critical' : 'subdued'}>
                                {stats.needsAttention} need review
                            </Text>

                            <Text as="span" tone="subdued">
                                Last sync: {stats.latestSyncedAt ? timeAgo(stats.latestSyncedAt) : 'Never'}
                            </Text>
                        </InlineStack>
                    </BlockStack>
                </InlineStack>

                <InlineStack gap="200" wrap>
                    <Button onClick={() => router.visit(route('webhook-events.index'))}>
                        View events
                    </Button>
                </InlineStack>
            </InlineStack>
        </Card>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Tabs and group overview
───────────────────────────────────────────────────────────────────────────── */

const TABS = [
    { id: 'all', content: 'All', panelID: 'panel-all' },
    { id: 'products', content: 'Products', panelID: 'panel-products' },
    { id: 'orders', content: 'Orders', panelID: 'panel-orders' },
    { id: 'customers', content: 'Customers', panelID: 'panel-customers' },
    { id: 'inventory', content: 'Inventory', panelID: 'panel-inventory' },
    { id: 'collections', content: 'Collections', panelID: 'panel-collections' },
    { id: 'fulfillment', content: 'Fulfillment', panelID: 'panel-fulfillment' },
    { id: 'checkout', content: 'Checkout', panelID: 'panel-checkout' },
    { id: 'metaobjects', content: 'Metaobjects', panelID: 'panel-metaobjects' },
];

const TAB_GROUPS = [
    null,
    'Products',
    'Orders',
    'Customers',
    'Inventory',
    'Collections',
    'Fulfillment',
    'Checkout',
    'Metaobjects',
];

const METAOBJECTS_TAB_INDEX = 8;

const GROUP_OVERVIEW = [
    {
        group: 'Products',
        description: 'Monitor product creation, updates, and deletion events.',
    },
    {
        group: 'Orders',
        description: 'Track order creation, updates, fulfillment, and deletion events.',
    },
    {
        group: 'Customers',
        description: 'Monitor customer account creation, updates, and deletion events.',
    },
    {
        group: 'Inventory',
        description: 'Track inventory item creation, updates, and deletion events.',
    },
    {
        group: 'Collections',
        description: 'Monitor collection creation, updates, and deletion events.',
    },
    {
        group: 'Fulfillment',
        description: 'Track fulfillment creation and update shipment activity.',
    },
    {
        group: 'Checkout',
        description: 'Monitor checkout creation, updates, and deletion events.',
    },
    {
        group: 'Metaobjects',
        description: 'Register filtered metaobject webhooks by metaobject type.',
    },
];

function getGroupStatusLabel(active, total, needsAttention = 0) {
    if (needsAttention > 0) return 'Needs review';
    if (total === 0) return 'Not configured';
    if (active === 0) return 'Not registered';
    if (active >= total) return 'Complete';

    return 'Partial';
}

function getGroupStatusTone(active, total, needsAttention = 0) {
    if (needsAttention > 0) return 'critical';
    if (total === 0) return 'subdued';
    if (active === 0) return 'attention';
    if (active >= total) return 'success';

    return 'warning';
}

function WebhookGroupOverview({ groupCards, onManageGroup, onViewEvents }) {
    return (
        <Box padding="400">
            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                    <BlockStack gap="100">
                        <Text as="h2" variant="headingMd">
                            Webhook groups
                        </Text>

                        <Text as="p" tone="subdued">
                            Manage Shopify webhooks by area instead of scrolling through every topic.
                        </Text>
                    </BlockStack>

                    <Badge tone="info">{groupCards.length} groups</Badge>
                </InlineStack>

                <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
                    {groupCards.map((group) => {
                        const progress = group.total > 0 ? Math.round((group.active / group.total) * 100) : 0;
                        const statusLabel = getGroupStatusLabel(group.active, group.total, group.needsAttention);
                        const statusTone = getGroupStatusTone(group.active, group.total, group.needsAttention);

                        return (
                            <Card key={group.group}>
                                <BlockStack gap="400">
                                    <InlineStack gap="300" align="start" blockAlign="start" wrap={false}>
                                        <TopicGroupIcon group={group.group} />

                                        <BlockStack gap="100">
                                            <InlineStack gap="200" blockAlign="center" wrap>
                                                <Text as="h3" variant="headingMd">
                                                    {group.group}
                                                </Text>

                                                <Badge tone={statusTone}>
                                                    {statusLabel}
                                                </Badge>
                                            </InlineStack>

                                            <Text as="p" variant="bodySm" tone="subdued">
                                                {group.description}
                                            </Text>
                                        </BlockStack>
                                    </InlineStack>

                                    <BlockStack gap="150">
                                        <InlineStack align="space-between" blockAlign="center">
                                            <Text as="span" variant="bodySm" tone="subdued">
                                                {group.active} of {group.total} active
                                            </Text>

                                            <Text as="span" variant="bodySm" tone="subdued">
                                                {progress}%
                                            </Text>
                                        </InlineStack>

                                        <ProgressBar
                                            progress={progress}
                                            tone={
                                                statusTone === 'critical'
                                                    ? 'critical'
                                                    : statusTone === 'attention' || statusTone === 'warning'
                                                        ? 'attention'
                                                        : 'success'
                                            }
                                            size="small"
                                        />
                                    </BlockStack>

                                    <InlineGrid columns={3} gap="200">
                                        <Box background="bg-surface-secondary" padding="200" borderRadius="200">
                                            <BlockStack gap="050">
                                                <Text as="p" variant="bodySm" tone="subdued">Active</Text>
                                                <Text as="p" variant="bodyMd" fontWeight="semibold">{group.active}</Text>
                                            </BlockStack>
                                        </Box>

                                        <Box background="bg-surface-secondary" padding="200" borderRadius="200">
                                            <BlockStack gap="050">
                                                <Text as="p" variant="bodySm" tone="subdued">Available</Text>
                                                <Text as="p" variant="bodyMd" fontWeight="semibold">{group.inactive}</Text>
                                            </BlockStack>
                                        </Box>

                                        <Box background="bg-surface-secondary" padding="200" borderRadius="200">
                                            <BlockStack gap="050">
                                                <Text as="p" variant="bodySm" tone="subdued">Review</Text>
                                                <Text as="p" variant="bodyMd" fontWeight="semibold">{group.needsAttention}</Text>
                                            </BlockStack>
                                        </Box>
                                    </InlineGrid>

                                    <InlineStack align="space-between" blockAlign="center" gap="200">
                                        <Button variant="primary" size="slim" onClick={() => onManageGroup(group.group)}>
                                            Manage
                                        </Button>

                                        <Button size="slim" variant="plain" onClick={() => onViewEvents(group.group)}>
                                            View events
                                        </Button>
                                    </InlineStack>
                                </BlockStack>
                            </Card>
                        );
                    })}
                </InlineGrid>
            </BlockStack>
        </Box>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────────────────── */

export default function Index({
    topics = [],
    subscriptions = {},
    metaobjectSubscriptions = [],
    metaobjectDefinitions = [],
    metaobjectDefinitionsError = null,
    lastSyncedAt = null,
}) {
    const { flash } = usePage().props;

    const [selectedTab, setSelectedTab] = useState(0);
    const [registering, setRegistering] = useState(null);
    const [registeringRecommended, setRegisteringRecommended] = useState(false);
    const [recommendedSummary, setRecommendedSummary] = useState(null);

    const [syncing, setSyncing] = useState(false);
    const [syncSummary, setSyncSummary] = useState(null);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [toast, setToast] = useState({
        active: false,
        message: '',
        isError: false,
    });

    const [selectedMetaType, setSelectedMetaType] = useState(
        metaobjectDefinitions.length > 0 ? metaobjectDefinitions[0].type : ''
    );

    const [selectedMetaTopics, setSelectedMetaTopics] = useState([
        'METAOBJECTS_CREATE',
        'METAOBJECTS_UPDATE',
        'METAOBJECTS_DELETE',
    ]);

    const [registeringMeta, setRegisteringMeta] = useState(false);

    const handleTabChange = useCallback((index) => setSelectedTab(index), []);

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

    const openDeleteModal = useCallback((sub) => setDeleteTarget(sub), []);

    const closeDeleteModal = useCallback(() => {
        if (!deleting) setDeleteTarget(null);
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

    const activeTopicsForType = useMemo(() => {
        if (!selectedMetaType) return new Set();

        return new Set(
            metaobjectSubscriptions
                .filter((sub) => sub.metaobject_type === selectedMetaType)
                .map((sub) => sub.topic_enum)
        );
    }, [metaobjectSubscriptions, selectedMetaType]);

    const metaByType = useMemo(() => {
        const groups = {};

        metaobjectSubscriptions.forEach((sub) => {
            const type = sub.metaobject_type ?? sub.filter ?? 'unknown';
            if (!groups[type]) groups[type] = [];
            groups[type].push(sub);
        });

        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }, [metaobjectSubscriptions]);

    const handleMetaTypeChange = useCallback(
        (type) => {
            setSelectedMetaType(type);

            const activeForType = new Set(
                metaobjectSubscriptions
                    .filter((sub) => sub.metaobject_type === type)
                    .map((sub) => sub.topic_enum)
            );

            setSelectedMetaTopics(
                ['METAOBJECTS_CREATE', 'METAOBJECTS_UPDATE', 'METAOBJECTS_DELETE'].filter(
                    (topic) => !activeForType.has(topic)
                )
            );
        },
        [metaobjectSubscriptions]
    );

    const handleRegisterMetaobject = useCallback(() => {
        const topicsToRegister = selectedMetaTopics.filter(
            (topic) => !activeTopicsForType.has(topic)
        );

        if (!selectedMetaType || topicsToRegister.length === 0) return;

        setRegisteringMeta(true);

        router.post(
            route('webhook-subscriptions.register-metaobject'),
            {
                metaobject_type: selectedMetaType,
                topics: topicsToRegister,
            },
            {
                preserveScroll: true,
                onFinish: () => setRegisteringMeta(false),
            }
        );
    }, [selectedMetaType, selectedMetaTopics, activeTopicsForType]);

    const group = TAB_GROUPS[selectedTab];

    const filteredTopics = (group
        ? topics.filter((topic) => topic.group === group)
        : topics
    ).filter((topic) => !topic.requires_filter);

    const stats = useMemo(() => {
        let active = 0;
        let inactive = 0;
        let needsAttention = 0;
        let unsupported = 0;

        topics.forEach((topic) => {
            if (topic.requires_filter) return;

            const sub = subscriptions?.[topic.topic_enum] ?? null;
            const status = getSubscriptionStatus(topic, sub);

            if (status === 'active') active += 1;
            if (status === 'inactive') inactive += 1;
            if (status === 'unsupported') unsupported += 1;

            if (['failed', 'missing_on_shopify', 'needs_attention'].includes(status)) {
                needsAttention += 1;
            }
        });

        active += metaobjectSubscriptions.length;

        return {
            active,
            inactive,
            needsAttention,
            unsupported,
            latestSyncedAt: lastSyncedAt,
        };
    }, [topics, subscriptions, metaobjectSubscriptions, lastSyncedAt]);

    const groupCards = useMemo(() => {
        return GROUP_OVERVIEW.map((groupItem) => {
            if (groupItem.group === 'Metaobjects') {
                const active = metaobjectSubscriptions.length;

                return {
                    ...groupItem,
                    active,
                    inactive: active > 0 ? 0 : 3,
                    needsAttention: 0,
                    total: active > 0 ? active : 3,
                };
            }

            const groupTopics = topics.filter(
                (topic) =>
                    topic.group === groupItem.group &&
                    !topic.requires_filter &&
                    topic.supported
            );

            let active = 0;
            let inactive = 0;
            let needsAttention = 0;

            groupTopics.forEach((topic) => {
                const sub = subscriptions?.[topic.topic_enum] ?? null;
                const status = getSubscriptionStatus(topic, sub);

                if (status === 'active') active += 1;
                if (status === 'inactive') inactive += 1;

                if (['failed', 'missing_on_shopify', 'needs_attention'].includes(status)) {
                    needsAttention += 1;
                }
            });

            return {
                ...groupItem,
                active,
                inactive,
                needsAttention,
                total: groupTopics.length,
            };
        });
    }, [topics, subscriptions, metaobjectSubscriptions]);

    const handleManageGroup = useCallback((groupName) => {
        const tabIndex = TAB_GROUPS.findIndex((tabGroup) => tabGroup === groupName);

        if (tabIndex >= 0) {
            setSelectedTab(tabIndex);
        }
    }, []);

    const handleViewGroupEvents = useCallback((groupName) => {
        router.visit(route('webhook-events.index'), {
            data: {
                group: groupName,
            },
        });
    }, []);

    const resourceName = {
        singular: 'webhook topic',
        plural: 'webhook topics',
    };

    const headings = [
        { title: 'Webhook' },
        { title: 'Status' },
        { title: 'Last synced' },
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
                    <InlineStack gap="300" align="start" blockAlign="start" wrap={false}>
                        <TopicGroupIcon group={topic.group} />

                        <BlockStack gap="150">
                            <InlineStack gap="200" blockAlign="center" wrap>
                                <Text as="span" variant="bodyMd" fontWeight="semibold">
                                    {topic.title}
                                </Text>

                                {topic.default_enabled && !isUnsupported && (
                                    <Badge tone="info">Recommended</Badge>
                                )}

                                {isUnsupported && (
                                    <Badge tone="subdued">Unsupported</Badge>
                                )}
                            </InlineStack>

                            <InlineStack gap="200" wrap>
                                <Text as="span" variant="bodySm" tone="subdued">
                                    {topic.topic_header || topic.topic}
                                </Text>

                                <Text as="span" variant="bodySm" tone="subdued">
                                    {topic.required_scope}
                                </Text>
                            </InlineStack>

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
                    </InlineStack>
                </IndexTable.Cell>

                <IndexTable.Cell>
                    <BlockStack gap="150">
                        <InlineStack gap="200" blockAlign="center" wrap>
                            <StatusIndicator status={status} />
                            <SubscriptionStatusBadge topic={topic} subscription={sub} />

                            {sub?.registration_method === 'rest' && (
                                <Tooltip content="GraphQL rejected this topic; registered via REST Admin API fallback.">
                                    <Badge tone="warning">REST</Badge>
                                </Tooltip>
                            )}
                        </InlineStack>

                        {sub?.last_error && ['failed', 'needs_attention', 'missing_on_shopify'].includes(sub?.status) && (
                            <Text as="span" variant="bodySm" tone="critical">
                                {sub.last_error.length > 80 ? `${sub.last_error.slice(0, 80)}…` : sub.last_error}
                            </Text>
                        )}
                    </BlockStack>
                </IndexTable.Cell>

                <IndexTable.Cell>
                    {sub?.endpoint_url ? (
                        <Tooltip content={sub.endpoint_url}>
                            <RelativeTime value={sub?.last_synced_at} />
                        </Tooltip>
                    ) : (
                        <RelativeTime value={sub?.last_synced_at} />
                    )}
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
                                onClick={() =>
                                    canDelete &&
                                    openDeleteModal({
                                        id: sub.id,
                                        title: topic.title,
                                    })
                                }
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
                            <strong>{deleteTarget?.title}</strong> webhook event to your app endpoint.
                            Existing webhook logs and event history will remain available.
                        </Text>
                    </Modal.Section>
                </Modal>

                <Page
                    title="Webhook Subscriptions"
                    subtitle="Register, sync, and manage Shopify webhook topics monitored by this app."
                    primaryAction={{
                        content: 'Register recommended',
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
                                            Created <strong>{syncSummary.created}</strong>, updated{' '}
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
                                            Registered <strong>{recommendedSummary.registered}</strong>, already active{' '}
                                            <strong>{recommendedSummary.already_active}</strong>, unsupported{' '}
                                            <strong>{recommendedSummary.unsupported}</strong>, skipped{' '}
                                            <strong>{recommendedSummary.skipped}</strong>.
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
                            <ActionBanner stats={stats} />
                        </Layout.Section>

                        <Layout.Section>
                            <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
                                <SummaryCard
                                    title="Active Webhooks"
                                    value={stats.active}
                                    helper="Currently registered in Shopify"
                                    tone="success"
                                />

                                <SummaryCard
                                    title="Available Webhooks"
                                    value={stats.inactive}
                                    helper="Ready to register"
                                    tone={stats.inactive > 0 ? 'attention' : 'subdued'}
                                />

                                <SummaryCard
                                    title="Needs Attention"
                                    value={stats.needsAttention}
                                    helper="Failed or missing on Shopify"
                                    tone={stats.needsAttention > 0 ? 'critical' : 'success'}
                                />

                                <SummaryCard
                                    title="Last Synced"
                                    value={stats.latestSyncedAt ? timeAgo(stats.latestSyncedAt) : '—'}
                                    helper="Latest subscription sync"
                                />
                            </InlineGrid>
                        </Layout.Section>

                        <Layout.Section>
                            <Banner tone="info">
                                <Text as="p">
                                    The <strong>app/uninstalled</strong> lifecycle webhook is managed automatically by the system and is not shown in this monitored webhook list.
                                </Text>
                            </Banner>
                        </Layout.Section>

                        <Layout.Section>
                            <Card padding="0">
                                <Box paddingBlockStart="300" paddingInline="300">
                                    <Tabs
                                        tabs={TABS}
                                        selected={selectedTab}
                                        onSelect={handleTabChange}
                                    />
                                </Box>

                                <Divider />

                                {selectedTab === 0 ? (
                                    <WebhookGroupOverview
                                        groupCards={groupCards}
                                        onManageGroup={handleManageGroup}
                                        onViewEvents={handleViewGroupEvents}
                                    />
                                ) : selectedTab === METAOBJECTS_TAB_INDEX ? (
                                    <Box padding="400">
                                        <MetaobjectPanel
                                            metaobjectDefinitions={metaobjectDefinitions}
                                            metaobjectDefinitionsError={metaobjectDefinitionsError}
                                            selectedMetaType={selectedMetaType}
                                            selectedMetaTopics={selectedMetaTopics}
                                            activeTopicsForType={activeTopicsForType}
                                            registeringMeta={registeringMeta}
                                            metaByType={metaByType}
                                            metaobjectSubscriptions={metaobjectSubscriptions}
                                            metaobjectDefinitionsList={metaobjectDefinitions}
                                            deleting={deleting}
                                            setSelectedMetaTopics={setSelectedMetaTopics}
                                            handleMetaTypeChange={handleMetaTypeChange}
                                            handleRegisterMetaobject={handleRegisterMetaobject}
                                            openDeleteModal={openDeleteModal}
                                        />
                                    </Box>
                                ) : filteredTopics.length > 0 ? (
                                    <BlockStack gap="000">
                                        <Box padding="400">
                                            <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                                                <InlineStack gap="300" align="start" blockAlign="start" wrap={false}>
                                                    <TopicGroupIcon group={group} />

                                                    <BlockStack gap="100">
                                                        <Text as="h2" variant="headingMd">
                                                            {group} webhooks
                                                        </Text>

                                                        <Text as="p" tone="subdued">
                                                            Register and manage webhook topics for {group.toLowerCase()}.
                                                        </Text>
                                                    </BlockStack>
                                                </InlineStack>

                                                <Button
                                                    variant="plain"
                                                    onClick={() => setSelectedTab(0)}
                                                >
                                                    Back to groups
                                                </Button>
                                            </InlineStack>
                                        </Box>

                                        <Divider />

                                        <IndexTable
                                            resourceName={resourceName}
                                            itemCount={filteredTopics.length}
                                            headings={headings}
                                            selectable={false}
                                        >
                                            {rowMarkup}
                                        </IndexTable>
                                    </BlockStack>
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

/* ─────────────────────────────────────────────────────────────────────────────
   Metaobject Panel
───────────────────────────────────────────────────────────────────────────── */

function MetaobjectPanel({
    metaobjectDefinitions,
    metaobjectDefinitionsError,
    selectedMetaType,
    selectedMetaTopics,
    activeTopicsForType,
    registeringMeta,
    metaByType,
    metaobjectSubscriptions,
    metaobjectDefinitionsList,
    deleting,
    setSelectedMetaTopics,
    handleMetaTypeChange,
    handleRegisterMetaobject,
    openDeleteModal,
}) {
    return (
        <BlockStack gap="500">
            <Card>
                <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                        <InlineStack gap="300" align="start" blockAlign="start" wrap={false}>
                            <TopicGroupIcon group="Metaobjects" />

                            <BlockStack gap="100">
                                <Text variant="headingMd" as="h3">
                                    Metaobject Monitoring
                                </Text>

                                <Text as="p" variant="bodyMd" tone="subdued">
                                    Register filtered metaobject webhooks by type. Shopify requires a specific type filter for metaobject events.
                                </Text>
                            </BlockStack>
                        </InlineStack>

                        {selectedMetaType && (
                            <Badge tone="info">type:{selectedMetaType}</Badge>
                        )}
                    </InlineStack>

                    <Banner tone="info">
                        <BlockStack gap="100">
                            <Text as="p" variant="bodyMd">
                                Metaobject webhooks trigger when <strong>entries</strong> of the selected type are created, updated, or deleted.
                            </Text>

                            <Text as="p" variant="bodyMd">
                                To test: Shopify Admin → Content → Metaobjects → select this type → create or edit an entry.
                            </Text>
                        </BlockStack>
                    </Banner>

                    {metaobjectDefinitionsError ? (
                        <Banner tone="critical" title="Could not load metaobject definitions">
                            {/scope|access.?denied|permission/i.test(metaobjectDefinitionsError) ? (
                                <Text as="p" variant="bodyMd">
                                    Make sure <strong>read_metaobjects</strong> and{' '}
                                    <strong>read_metaobject_definitions</strong> scopes are granted, then reinstall the app.
                                </Text>
                            ) : (
                                <Text as="p" variant="bodyMd">
                                    {metaobjectDefinitionsError}
                                </Text>
                            )}
                        </Banner>
                    ) : metaobjectDefinitions.length === 0 ? (
                        <Banner tone="info" title="No metaobject definitions found">
                            <Text as="p" variant="bodyMd">
                                Create metaobject definitions in Shopify Admin under <strong>Content → Metaobjects</strong>, then return here to register webhooks.
                            </Text>
                        </Banner>
                    ) : (
                        <BlockStack gap="400">
                            <Select
                                label="Metaobject type"
                                options={metaobjectDefinitions.map((definition) => ({
                                    label: `${definition.name} (${definition.type})`,
                                    value: definition.type,
                                }))}
                                value={selectedMetaType}
                                onChange={handleMetaTypeChange}
                                helpText={
                                    selectedMetaType
                                        ? `Shopify filter: type:${selectedMetaType}`
                                        : ''
                                }
                            />

                            <ChoiceList
                                title="Webhook events"
                                allowMultiple
                                choices={[
                                    {
                                        label: activeTopicsForType.has('METAOBJECTS_CREATE')
                                            ? 'Created (already active)'
                                            : 'Created',
                                        value: 'METAOBJECTS_CREATE',
                                        disabled: activeTopicsForType.has('METAOBJECTS_CREATE'),
                                    },
                                    {
                                        label: activeTopicsForType.has('METAOBJECTS_UPDATE')
                                            ? 'Updated (already active)'
                                            : 'Updated',
                                        value: 'METAOBJECTS_UPDATE',
                                        disabled: activeTopicsForType.has('METAOBJECTS_UPDATE'),
                                    },
                                    {
                                        label: activeTopicsForType.has('METAOBJECTS_DELETE')
                                            ? 'Deleted (already active)'
                                            : 'Deleted',
                                        value: 'METAOBJECTS_DELETE',
                                        disabled: activeTopicsForType.has('METAOBJECTS_DELETE'),
                                    },
                                ]}
                                selected={[
                                    ...selectedMetaTopics,
                                    ...Array.from(activeTopicsForType),
                                ]}
                                onChange={(values) =>
                                    setSelectedMetaTopics(
                                        values.filter((topic) => !activeTopicsForType.has(topic))
                                    )
                                }
                            />

                            <InlineStack>
                                <Button
                                    variant="primary"
                                    loading={registeringMeta}
                                    disabled={
                                        registeringMeta ||
                                        selectedMetaTopics.filter((topic) => !activeTopicsForType.has(topic)).length === 0 ||
                                        !selectedMetaType
                                    }
                                    onClick={handleRegisterMetaobject}
                                >
                                    Register selected metaobject webhooks
                                </Button>
                            </InlineStack>
                        </BlockStack>
                    )}
                </BlockStack>
            </Card>

            {metaByType.length > 0 ? (
                <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center" gap="300" wrap>
                        <BlockStack gap="100">
                            <Text variant="headingMd" as="h3">
                                Registered Metaobject Subscriptions
                            </Text>

                            <Text as="p" tone="subdued">
                                Active filtered webhook subscriptions grouped by metaobject type.
                            </Text>
                        </BlockStack>
                    </InlineStack>

                    {metaByType.map(([type, subs]) => {
                        const defName =
                            metaobjectDefinitionsList.find((definition) => definition.type === type)?.name ?? type;

                        return (
                            <Card key={type} padding="0">
                                <Box padding="400">
                                    <InlineStack align="space-between" blockAlign="start" gap="300" wrap>
                                        <BlockStack gap="050">
                                            <Text variant="headingSm" as="h4">
                                                {defName}
                                            </Text>

                                            <Text as="span" variant="bodySm" tone="subdued">
                                                type:{type}
                                            </Text>
                                        </BlockStack>

                                        <Badge tone="success">
                                            {subs.length} active
                                        </Badge>
                                    </InlineStack>
                                </Box>

                                <Divider />

                                <IndexTable
                                    resourceName={{
                                        singular: 'subscription',
                                        plural: 'subscriptions',
                                    }}
                                    itemCount={subs.length}
                                    headings={[
                                        { title: 'Event' },
                                        { title: 'Status' },
                                        { title: 'Last synced' },
                                        { title: 'Actions' },
                                    ]}
                                    selectable={false}
                                >
                                    {subs.map((sub, index) => (
                                        <IndexTable.Row
                                            id={String(sub.id)}
                                            key={sub.id}
                                            position={index}
                                        >
                                            <IndexTable.Cell>
                                                <Text as="span" fontWeight="semibold">
                                                    {sub.title}
                                                </Text>
                                            </IndexTable.Cell>

                                            <IndexTable.Cell>
                                                <InlineStack gap="200" blockAlign="center">
                                                    <StatusIndicator status={sub.status} />
                                                    <Badge tone="success">
                                                        {humanize(sub.status)}
                                                    </Badge>
                                                </InlineStack>
                                            </IndexTable.Cell>

                                            <IndexTable.Cell>
                                                <RelativeTime value={sub.last_synced_at} />
                                            </IndexTable.Cell>

                                            <IndexTable.Cell>
                                                <Button
                                                    size="slim"
                                                    tone="critical"
                                                    variant="plain"
                                                    disabled={deleting}
                                                    onClick={() =>
                                                        !deleting &&
                                                        openDeleteModal({
                                                            id: sub.id,
                                                            title: sub.title,
                                                        })
                                                    }
                                                >
                                                    Delete
                                                </Button>
                                            </IndexTable.Cell>
                                        </IndexTable.Row>
                                    ))}
                                </IndexTable>
                            </Card>
                        );
                    })}
                </BlockStack>
            ) : (
                <Card>
                    <EmptyState
                        heading="No metaobject webhooks registered yet"
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    >
                        <Text as="p" variant="bodyMd" tone="subdued">
                            Choose a metaobject type and events above to start monitoring filtered metaobject webhooks.
                        </Text>
                    </EmptyState>
                </Card>
            )}
        </BlockStack>
    );
}
