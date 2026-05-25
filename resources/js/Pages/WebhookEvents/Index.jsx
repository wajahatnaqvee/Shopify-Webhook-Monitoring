import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    Tabs,
    IndexTable,
    IndexFilters,
    useSetIndexFiltersMode,
    ChoiceList,
    Box,
    EmptyState,
    Pagination,
    Banner,
    Tooltip,
    Divider,
} from '@shopify/polaris';

import StatusBadge from '@/Components/Webhooks/StatusBadge';
import RelativeTime from '@/Components/Webhooks/RelativeTime';
import { humanize } from '@/Components/Webhooks/utils';

const TABS = [
    { id: 'all', content: 'All', panelID: 'events-all' },
    { id: 'products', content: 'Products', panelID: 'events-products' },
    { id: 'orders', content: 'Orders', panelID: 'events-orders' },
    { id: 'customers', content: 'Customers', panelID: 'events-customers' },
    { id: 'inventory', content: 'Inventory', panelID: 'events-inventory' },
    { id: 'collections', content: 'Collections', panelID: 'events-collections' },
    { id: 'fulfillment', content: 'Fulfillment', panelID: 'events-fulfillment' },
    { id: 'checkout', content: 'Checkout', panelID: 'events-checkout' },
    { id: 'metaobjects', content: 'Metaobjects', panelID: 'events-metaobjects' },
];

const STATUS_OPTIONS = [
    { label: 'All', value: '' },
    { label: 'Success', value: 'success' },
    { label: 'Pending', value: 'pending' },
    { label: 'Processing', value: 'processing' },
    { label: 'Failed', value: 'failed' },
    { label: 'Ignored', value: 'ignored' },
];

const GROUP_OVERVIEW = [
    {
        group: 'Products',
        description: 'Product creation, updates, and deletion events.',
    },
    {
        group: 'Orders',
        description: 'Order creation, updates, fulfillment, and deletion events.',
    },
    {
        group: 'Customers',
        description: 'Customer account creation, updates, and deletion events.',
    },
    {
        group: 'Inventory',
        description: 'Inventory item creation, updates, and deletion events.',
    },
    {
        group: 'Collections',
        description: 'Collection creation, updates, and deletion events.',
    },
    {
        group: 'Fulfillment',
        description: 'Fulfillment creation and shipment update activity.',
    },
    {
        group: 'Checkout',
        description: 'Checkout creation, updates, and deletion events.',
    },
    {
        group: 'Metaobjects',
        description: 'Metaobject entry creation, updates, and deletion events.',
    },
];

function getGroupStatusLabel(card) {
    if (card.failed > 0) return 'Needs review';
    if (card.waiting > 0) return 'Processing';
    if (card.total > 0) return 'Receiving events';

    return 'No events yet';
}

function getGroupStatusTone(card) {
    if (card.failed > 0) return 'critical';
    if (card.waiting > 0) return 'attention';
    if (card.total > 0) return 'success';

    return 'subdued';
}

function safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function getCurrentGroupFromTab(index) {
    if (index === 1) return 'Products';
    if (index === 2) return 'Orders';
    if (index === 3) return 'Customers';
    if (index === 4) return 'Inventory';
    if (index === 5) return 'Collections';
    if (index === 6) return 'Fulfillment';
    if (index === 7) return 'Checkout';
    if (index === 8) return 'Metaobjects';

    return '';
}

function getInitialTab(group) {
    if (group === 'Products') return 1;
    if (group === 'Orders') return 2;
    if (group === 'Customers') return 3;
    if (group === 'Inventory') return 4;
    if (group === 'Collections') return 5;
    if (group === 'Fulfillment') return 6;
    if (group === 'Checkout') return 7;
    if (group === 'Metaobjects') return 8;

    return 0;
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

function getResourceLine(event) {
    if (!event.resource_name) return null;

    let value = `${resourceTypeLabel(event.resource_type)}: ${event.resource_name}`;

    if (event.resource_identifier && event.resource_type === 'product') {
        value += ` · /${event.resource_identifier}`;
    }

    if (event.resource_identifier && event.resource_type === 'order') {
        value += ` · #${event.resource_identifier}`;
    }

    if (event.resource_identifier && event.resource_type === 'collection') {
        value += ` · /${event.resource_identifier}`;
    }

    if (event.resource_identifier && event.resource_type === 'fulfillment') {
        value += ` · Order ${event.resource_identifier}`;
    }

    if (event.resource_identifier && event.resource_type === 'checkout') {
        value += ` · ${event.resource_identifier}`;
    }

    if (event.resource_identifier && event.resource_type === 'metaobject') {
        value += ` · ${event.resource_identifier}`;
    }

    return value;
}

function getStatusTone(status) {
    if (status === 'success') return 'success';
    if (status === 'failed') return 'critical';
    if (status === 'pending' || status === 'processing') return 'attention';
    if (status === 'ignored') return 'info';

    return 'subdued';
}

function getStatusIcon(status) {
    const isSuccess = status === 'success';
    const isFailed = status === 'failed';
    const isPending = status === 'pending' || status === 'processing';

    if (isFailed) {
        return (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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

function StatusIconBox({ status }) {
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
            {getStatusIcon(status)}
        </div>
    );
}

function EventTypeIcon({ group }) {
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
                width: 36,
                height: 36,
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

function SummaryCard({ title, value, helper, tone = 'subdued' }) {
    const toneColor =
        tone === 'critical'
            ? '#D72C0D'
            : tone === 'success'
                ? '#008060'
                : tone === 'attention'
                    ? '#8A6116'
                    : '#2C6ECB';

    return (
        <Card>
            <BlockStack gap="200">
                <InlineStack align="space-between" blockAlign="start" gap="300">
                    <BlockStack gap="100">
                        <Text as="p" variant="bodySm" tone="subdued">
                            {title}
                        </Text>

                        <Text as="p" variant="headingXl">
                            <span style={{ color: toneColor }}>{value}</span>
                        </Text>
                    </BlockStack>

                    <StatusIconBox status={tone === 'critical' ? 'failed' : tone === 'success' ? 'success' : tone === 'attention' ? 'pending' : 'ignored'} />
                </InlineStack>

                <Text as="p" variant="bodySm" tone="subdued">
                    {helper}
                </Text>
            </BlockStack>
        </Card>
    );
}

function EventsHealthBanner({ summary, total, autoRefresh }) {
    const failed = safeNumber(summary.failed);
    const pending = safeNumber(summary.pending);
    const healthy = failed === 0 && pending === 0;

    return (
        <Card>
            <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                <InlineStack align="start" blockAlign="start" gap="400" wrap={false}>
                    <StatusIconBox status={failed > 0 ? 'failed' : pending > 0 ? 'pending' : 'success'} />

                    <BlockStack gap="150">
                        <InlineStack gap="200" blockAlign="center" wrap>
                            <Text as="h2" variant="headingLg">
                                {healthy ? 'Webhook deliveries are healthy' : 'Webhook deliveries need review'}
                            </Text>

                            <Badge tone={healthy ? 'success' : failed > 0 ? 'critical' : 'attention'}>
                                {healthy ? 'Healthy' : failed > 0 ? 'Needs review' : 'Processing'}
                            </Badge>
                        </InlineStack>

                        <Text as="p" tone="subdued">
                            {healthy
                                ? 'All events on this page are processing successfully.'
                                : 'Review failed or pending webhook deliveries and open the event details for more information.'}
                        </Text>

                        <InlineStack gap="400" wrap>
                            <Text as="span" tone="subdued">
                                {total} total events
                            </Text>

                            <Text as="span" tone="subdued">
                                {summary.success} successful
                            </Text>

                            <Text as="span" tone={pending > 0 ? 'caution' : 'subdued'}>
                                {pending} waiting
                            </Text>

                            <Text as="span" tone={failed > 0 ? 'critical' : 'subdued'}>
                                {failed} failed
                            </Text>

                            {autoRefresh && (
                                <Text as="span" tone="subdued">
                                    Auto-refresh every 10s
                                </Text>
                            )}
                        </InlineStack>
                    </BlockStack>
                </InlineStack>
            </InlineStack>
        </Card>
    );
}

function EventGroupOverview({ groupCards, onManageGroup, onViewEvents }) {
    const totalVisible = groupCards.reduce((total, card) => total + card.total, 0);

    return (
        <Box padding="400">
            <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                    <InlineStack align="start" blockAlign="start" gap="300" wrap={false}>
                        <StatusIconBox status="success" />

                        <BlockStack gap="100">
                            <Text as="h2" variant="headingMd">
                                Webhook event groups
                            </Text>

                            <Text as="p" tone="subdued">
                                Review events by Shopify area instead of scanning every delivery in one long list.
                            </Text>
                        </BlockStack>
                    </InlineStack>

                    <Badge tone="info">
                        {totalVisible} event{totalVisible === 1 ? '' : 's'} on this page
                    </Badge>
                </InlineStack>

                <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
                    {groupCards.map((card) => {
                        const statusLabel = getGroupStatusLabel(card);
                        const statusTone = getGroupStatusTone(card);
                        const successRate = card.total > 0
                            ? Math.round((card.success / card.total) * 100)
                            : 0;

                        return (
                            <Card key={card.group}>
                                <BlockStack gap="400">
                                    <InlineStack align="space-between" blockAlign="start" gap="300" wrap={false}>
                                        <InlineStack align="start" blockAlign="start" gap="300" wrap={false}>
                                            <EventTypeIcon group={card.group} />

                                            <BlockStack gap="100">
                                                <InlineStack gap="200" blockAlign="center" wrap>
                                                    <Text as="h3" variant="headingMd">
                                                        {card.group}
                                                    </Text>

                                                    <Badge tone={statusTone}>
                                                        {statusLabel}
                                                    </Badge>
                                                </InlineStack>

                                                <Text as="p" variant="bodySm" tone="subdued">
                                                    {card.description}
                                                </Text>
                                            </BlockStack>
                                        </InlineStack>
                                    </InlineStack>

                                    <BlockStack gap="150">
                                        <InlineStack align="space-between" blockAlign="center">
                                            <Text as="span" variant="bodySm" tone="subdued">
                                                {card.total} visible event{card.total === 1 ? '' : 's'}
                                            </Text>

                                            <Text as="span" variant="bodySm" tone="subdued">
                                                {successRate}% processed
                                            </Text>
                                        </InlineStack>

                                        <div
                                            style={{
                                                height: 8,
                                                borderRadius: 999,
                                                background: '#E7E9EB',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    height: '100%',
                                                    width: `${successRate}%`,
                                                    minWidth: card.success > 0 ? 8 : 0,
                                                    background: card.failed > 0 ? '#D72C0D' : card.waiting > 0 ? '#F2B705' : '#008060',
                                                    borderRadius: 999,
                                                }}
                                            />
                                        </div>
                                    </BlockStack>

                                    <InlineGrid columns={3} gap="200">
                                        <Box background="bg-surface-secondary" padding="200" borderRadius="200">
                                            <BlockStack gap="050">
                                                <Text as="p" variant="bodySm" tone="subdued">
                                                    Processed
                                                </Text>
                                                <Text as="p" variant="bodyMd" fontWeight="semibold">
                                                    {card.success}
                                                </Text>
                                            </BlockStack>
                                        </Box>

                                        <Box background="bg-surface-secondary" padding="200" borderRadius="200">
                                            <BlockStack gap="050">
                                                <Text as="p" variant="bodySm" tone="subdued">
                                                    Waiting
                                                </Text>
                                                <Text as="p" variant="bodyMd" fontWeight="semibold">
                                                    {card.waiting}
                                                </Text>
                                            </BlockStack>
                                        </Box>

                                        <Box background="bg-surface-secondary" padding="200" borderRadius="200">
                                            <BlockStack gap="050">
                                                <Text as="p" variant="bodySm" tone="subdued">
                                                    Failed
                                                </Text>
                                                <Text as="p" variant="bodyMd" fontWeight="semibold">
                                                    {card.failed}
                                                </Text>
                                            </BlockStack>
                                        </Box>
                                    </InlineGrid>

                                    {card.latestEvent && (
                                        <Text as="p" variant="bodySm" tone="subdued">
                                            Latest: {card.latestEvent.topic} · <RelativeTime value={card.latestEvent.received_at} />
                                        </Text>
                                    )}

                                    <InlineStack align="space-between" blockAlign="center" gap="200">
                                        <Button
                                            variant="primary"
                                            size="slim"
                                            onClick={() => onManageGroup(card.group)}
                                        >
                                            Open group
                                        </Button>

                                        <Button
                                            size="slim"
                                            variant="plain"
                                            onClick={() => onViewEvents(card.group)}
                                        >
                                            View events
                                        </Button>
                                    </InlineStack>
                                </BlockStack>
                            </Card>
                        );
                    })}
                </InlineGrid>

                <Banner tone="info">
                    <Text as="p">
                        The overview uses the events currently loaded on this page. Open a group to view filtered deliveries for that Shopify area.
                    </Text>
                </Banner>
            </BlockStack>
        </Box>
    );
}


export default function Index({ events, filters = {} }) {
    const items = events?.data ?? [];

    const initialTab = useMemo(() => getInitialTab(filters.group), [filters.group]);

    const [selectedTab, setSelectedTab] = useState(initialTab);
    const [queryValue, setQueryValue] = useState(filters.search ?? '');
    const [statusValue, setStatusValue] = useState(filters.status ?? '');
    const [sortSelected, setSortSelected] = useState(['received_at desc']);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const autoRefreshRef = useRef(null);

    const { mode, setMode } = useSetIndexFiltersMode();

    const sortOptions = [
        { label: 'Newest first', value: 'received_at desc' },
        { label: 'Oldest first', value: 'received_at asc' },
        { label: 'Status', value: 'status asc' },
    ];

    const currentGroup = getCurrentGroupFromTab(selectedTab);

    useEffect(() => {
        if (autoRefresh) {
            autoRefreshRef.current = setInterval(() => {
                router.reload({
                    only: ['events'],
                    preserveScroll: true,
                    preserveState: true,
                });
            }, 10000);
        }

        return () => {
            if (autoRefreshRef.current) {
                clearInterval(autoRefreshRef.current);
                autoRefreshRef.current = null;
            }
        };
    }, [autoRefresh]);

    const applyFilters = useCallback(
        (overrides = {}) => {
            const payload = {
                search: overrides.search ?? queryValue,
                status: overrides.status ?? statusValue,
                group: overrides.group ?? currentGroup,
                page: overrides.page ?? 1,
            };

            Object.keys(payload).forEach((key) => {
                if (payload[key] === '' || payload[key] == null) {
                    delete payload[key];
                }
            });

            router.get(route('webhook-events.index'), payload, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        },
        [queryValue, statusValue, currentGroup]
    );

    const handleTabChange = useCallback(
        (index) => {
            setSelectedTab(index);

            if (index === 0) {
                setQueryValue('');
                setStatusValue('');
                applyFilters({ group: '', search: '', status: '', page: 1 });
                return;
            }

            applyFilters({ group: getCurrentGroupFromTab(index), page: 1 });
        },
        [applyFilters]
    );
    const handleQueryValueChange = useCallback((value) => {
        setQueryValue(value);
    }, []);

    const handleStatusChange = useCallback((value) => {
        setStatusValue(value[0] ?? '');
    }, []);

    const handleFiltersQuerySubmit = useCallback(() => {
        applyFilters({ page: 1 });
    }, [applyFilters]);

    const handleQueryValueRemove = useCallback(() => {
        setQueryValue('');
        applyFilters({ search: '', page: 1 });
    }, [applyFilters]);

    const handleStatusRemove = useCallback(() => {
        setStatusValue('');
        applyFilters({ status: '', page: 1 });
    }, [applyFilters]);

    const handleClearAll = useCallback(() => {
        setQueryValue('');
        setStatusValue('');
        setSelectedTab(0);

        router.get(route('webhook-events.index'), {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }, []);

    const appliedFilters = [];

    if (statusValue) {
        const selectedStatusLabel =
            STATUS_OPTIONS.find((option) => option.value === statusValue)?.label ?? statusValue;

        appliedFilters.push({
            key: 'status',
            label: `Status: ${selectedStatusLabel}`,
            onRemove: handleStatusRemove,
        });
    }

    const promotedBulkActions = [];

    const summary = useMemo(() => {
        return items.reduce(
            (acc, item) => {
                acc.total += 1;

                if (item.status === 'success') acc.success += 1;
                if (item.status === 'pending' || item.status === 'processing') acc.pending += 1;
                if (item.status === 'failed') acc.failed += 1;

                return acc;
            },
            { total: 0, success: 0, pending: 0, failed: 0 }
        );
    }, [items]);

    const groupCards = useMemo(() => {
        return GROUP_OVERVIEW.map((groupItem) => {
            const groupEvents = items.filter((event) => event.group === groupItem.group);
            const success = groupEvents.filter((event) => event.status === 'success').length;
            const waiting = groupEvents.filter((event) => event.status === 'pending' || event.status === 'processing').length;
            const failed = groupEvents.filter((event) => event.status === 'failed').length;
            const skipped = groupEvents.filter((event) => event.status === 'ignored').length;

            return {
                ...groupItem,
                total: groupEvents.length,
                success,
                waiting,
                failed,
                skipped,
                latestEvent: groupEvents[0] ?? null,
            };
        });
    }, [items]);

    const handleManageGroup = useCallback(
        (groupName) => {
            const tabIndex = TABS.findIndex((tab) => tab.content === groupName);

            if (tabIndex >= 0) {
                setSelectedTab(tabIndex);
                applyFilters({ group: groupName, page: 1 });
            }
        },
        [applyFilters]
    );

    const handleViewGroupEvents = useCallback(
        (groupName) => {
            const tabIndex = TABS.findIndex((tab) => tab.content === groupName);

            if (tabIndex >= 0) {
                setSelectedTab(tabIndex);
            }

            applyFilters({ group: groupName, page: 1 });
        },
        [applyFilters]
    );

    const rowMarkup = items.map((event, index) => {
        const resourceLine = getResourceLine(event);
        const showCheckoutNote = event.topic === 'checkouts/update';

        return (
            <IndexTable.Row
                id={String(event.id)}
                key={event.id}
                position={index}
                onClick={() => router.visit(route('webhook-events.show', event.id))}
            >
                <IndexTable.Cell>
                    <InlineStack gap="300" align="start" blockAlign="start" wrap={false}>
                        <EventTypeIcon group={event.group} />

                        <BlockStack gap="150">
                            <InlineStack gap="200" blockAlign="center" wrap>
                                <Text as="span" variant="bodyMd" fontWeight="semibold">
                                    {event.topic}
                                </Text>

                                <Badge tone="info">
                                    {event.group ?? 'Webhook'}
                                </Badge>
                            </InlineStack>

                            {resourceLine && (
                                <Text as="span" variant="bodySm" tone="subdued">
                                    {resourceLine}
                                </Text>
                            )}

                            <Text as="span" variant="bodySm" tone="subdued">
                                {event.action ? humanize(event.action) : 'Event'} · Delivery ID: {event.id ?? '-'}
                            </Text>

                            {showCheckoutNote && (
                                <Text as="span" variant="bodySm" tone="subdued">
                                    Checkout updates can appear multiple times during one checkout session.
                                </Text>
                            )}
                        </BlockStack>
                    </InlineStack>
                </IndexTable.Cell>

                <IndexTable.Cell>
                    <InlineStack gap="200" blockAlign="center" wrap={false}>
                        {/* <StatusIconBox status={event.status} /> */}
                        <StatusBadge status={event.status} />
                    </InlineStack>
                </IndexTable.Cell>

                <IndexTable.Cell>
                    <Text as="span" variant="bodyMd">
                        {event.attempts ?? 0}
                    </Text>
                </IndexTable.Cell>

                <IndexTable.Cell>
                    <RelativeTime value={event.received_at} />
                </IndexTable.Cell>

                <IndexTable.Cell>
                    <Link href={route('webhook-events.show', event.id)}>
                        View
                    </Link>
                </IndexTable.Cell>
            </IndexTable.Row>
        );
    });

    return (
        <>
            <Head title="Webhook Events" />

            <Page
                title="Webhook Events"
                subtitle="Review Shopify webhook deliveries, processing state, and event details."
                primaryAction={{
                    content: 'Refresh',
                    onAction: () =>
                        router.get(
                            route('webhook-events.index'),
                            {
                                search: queryValue || undefined,
                                status: statusValue || undefined,
                                group: currentGroup || undefined,
                                page: events?.current_page ?? 1,
                            },
                            {
                                preserveState: true,
                                preserveScroll: true,
                                replace: true,
                            }
                        ),
                }}
                secondaryActions={[
                    {
                        content: autoRefresh ? 'Auto-refresh on' : 'Auto-refresh',
                        onAction: () => setAutoRefresh((value) => !value),
                        pressed: autoRefresh,
                    },
                ]}
            >
                <BlockStack gap="500">
                    <EventsHealthBanner
                        summary={summary}
                        total={events?.total ?? 0}
                        autoRefresh={autoRefresh}
                    />

                    {summary.failed > 0 && (
                        <Banner
                            tone="critical"
                            title={`${summary.failed} failed event${summary.failed > 1 ? 's' : ''} on this page`}
                        >
                            <Text as="p">
                                Open the failed event details to review the error and replay the event when ready.
                            </Text>
                        </Banner>
                    )}

                    <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
                        <SummaryCard
                            title="On This Page"
                            value={summary.total}
                            helper={`${events?.total ?? 0} total events`}
                            tone="info"
                        />

                        <SummaryCard
                            title="Processed"
                            value={summary.success}
                            helper="Handled successfully"
                            tone="success"
                        />

                        <SummaryCard
                            title="Waiting"
                            value={summary.pending}
                            helper="Queued or processing"
                            tone="attention"
                        />

                        <SummaryCard
                            title="Failed"
                            value={summary.failed}
                            helper="Need review"
                            tone={summary.failed > 0 ? 'critical' : 'subdued'}
                        />
                    </InlineGrid>

                    <Card padding="0">
                        <Box paddingBlockStart="300" paddingInline="300">
                            <Tabs tabs={TABS} selected={selectedTab} onSelect={handleTabChange} />
                        </Box>

                        <Divider />

                        {selectedTab !== 0 && (
                            <>
                                <Box padding="300">
                                    <IndexFilters
                                        sortOptions={sortOptions}
                                        sortSelected={sortSelected}
                                        queryValue={queryValue}
                                        queryPlaceholder="Search topic, resource name, webhook ID"
                                        onQueryChange={handleQueryValueChange}
                                        onQueryClear={handleQueryValueRemove}
                                        onSort={setSortSelected}
                                        cancelAction={{
                                            onAction: handleClearAll,
                                            disabled: false,
                                            loading: false,
                                        }}
                                        tabs={[]}
                                        selected={0}
                                        onSelect={() => { }}
                                        canCreateNewView={false}
                                        filters={[
                                            {
                                                key: 'status',
                                                label: 'Status',
                                                filter: (
                                                    <ChoiceList
                                                        title="Status"
                                                        titleHidden
                                                        choices={STATUS_OPTIONS}
                                                        selected={[statusValue]}
                                                        onChange={handleStatusChange}
                                                    />
                                                ),
                                                shortcut: true,
                                            },
                                        ]}
                                        appliedFilters={appliedFilters}
                                        onClearAll={handleClearAll}
                                        mode={mode}
                                        setMode={setMode}
                                        primaryAction={{
                                            type: 'save-as',
                                            disabled: true,
                                            onAction: () => { },
                                        }}
                                        onQuerySubmit={handleFiltersQuerySubmit}
                                        promotedBulkActions={promotedBulkActions}
                                    />
                                </Box>

                                <Divider />
                            </>
                        )}
                        <Divider />

                        {selectedTab === 0 ? (
                            items.length > 0 ? (
                                <>
                                    <EventGroupOverview
                                        groupCards={groupCards}
                                        onManageGroup={handleManageGroup}
                                        onViewEvents={handleViewGroupEvents}
                                    />

                                    <Divider />

                                    {selectedTab !== 0 && (
                                        <Box padding="400">
                                            <InlineStack align="center">
                                                <Pagination
                                                    hasPrevious={Boolean(events?.prev_page_url)}
                                                    onPrevious={() =>
                                                        applyFilters({ page: (events?.current_page ?? 1) - 1 })
                                                    }
                                                    hasNext={Boolean(events?.next_page_url)}
                                                    onNext={() =>
                                                        applyFilters({ page: (events?.current_page ?? 1) + 1 })
                                                    }
                                                    label={`${events?.from ?? 0}-${events?.to ?? 0} of ${events?.total ?? 0}`}
                                                />
                                            </InlineStack>
                                        </Box>
                                    )}
                                </>
                            ) : (
                                <Box padding="600">
                                    <EmptyState
                                        heading="No webhook events found"
                                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                    >
                                        <Text as="p" variant="bodyMd" tone="subdued">
                                            Try changing your filters, or wait for Shopify to send new webhook deliveries.
                                        </Text>
                                    </EmptyState>
                                </Box>
                            )
                        ) : items.length > 0 ? (
                            <>
                                <Box padding="400">
                                    <InlineStack align="space-between" blockAlign="start" gap="400" wrap>
                                        <InlineStack gap="300" align="start" blockAlign="start" wrap={false}>
                                            <EventTypeIcon group={currentGroup} />

                                            <BlockStack gap="100">
                                                <Text as="h2" variant="headingMd">
                                                    {currentGroup} events
                                                </Text>

                                                <Text as="p" tone="subdued">
                                                    Filtered webhook deliveries for {currentGroup.toLowerCase()}.
                                                </Text>
                                            </BlockStack>
                                        </InlineStack>

                                        <Button
                                            variant="plain"
                                            onClick={() => {
                                                setQueryValue('');
                                                setStatusValue('');
                                                setSelectedTab(0);
                                                applyFilters({ group: '', search: '', status: '', page: 1 });
                                            }}
                                        >
                                            Back to groups
                                        </Button>
                                    </InlineStack>
                                </Box>

                                <Divider />

                                <IndexTable
                                    resourceName={{
                                        singular: 'webhook event',
                                        plural: 'webhook events',
                                    }}
                                    itemCount={items.length}
                                    selectable={false}
                                    headings={[
                                        { title: 'Event' },
                                        { title: 'Status' },
                                        { title: 'Attempts' },
                                        { title: 'Received' },
                                        { title: 'Actions' },
                                    ]}
                                >
                                    {rowMarkup}
                                </IndexTable>

                                <Box padding="400">
                                    <InlineStack align="center">
                                        <Pagination
                                            hasPrevious={Boolean(events?.prev_page_url)}
                                            onPrevious={() =>
                                                applyFilters({ page: (events?.current_page ?? 1) - 1 })
                                            }
                                            hasNext={Boolean(events?.next_page_url)}
                                            onNext={() =>
                                                applyFilters({ page: (events?.current_page ?? 1) + 1 })
                                            }
                                            label={`${events?.from ?? 0}-${events?.to ?? 0} of ${events?.total ?? 0}`}
                                        />
                                    </InlineStack>
                                </Box>
                            </>
                        ) : (
                            <Box padding="600">
                                <EmptyState
                                    heading={`${currentGroup || 'Webhook'} events not found`}
                                    image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                                >
                                    <BlockStack gap="300">
                                        <Text as="p" variant="bodyMd" tone="subdued">
                                            No webhook deliveries match this group or filter.
                                        </Text>

                                        <InlineStack align="center">
                                            <Button
                                                onClick={() => {
                                                    setSelectedTab(0);
                                                    applyFilters({ group: '', status: '', search: '', page: 1 });
                                                }}
                                            >
                                                Back to all groups
                                            </Button>
                                        </InlineStack>
                                    </BlockStack>
                                </EmptyState>
                            </Box>
                        )}
                    </Card>

                    {autoRefresh && (
                        <Card>
                            <Box padding="300">
                                <InlineStack align="center" gap="200">
                                    <StatusIconBox status="pending" />

                                    <Text as="p" variant="bodySm" tone="subdued">
                                        Auto-refresh is enabled. This page refreshes every 10 seconds.
                                    </Text>
                                </InlineStack>
                            </Box>
                        </Card>
                    )}
                </BlockStack>
            </Page>
        </>
    );
}