import { useCallback, useMemo, useState } from 'react';
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
} from '@shopify/polaris';

const TABS = [
    { id: 'all', content: 'All', panelID: 'events-all' },
    { id: 'products', content: 'Products', panelID: 'events-products' },
    { id: 'orders', content: 'Orders', panelID: 'events-orders' },
];

const STATUS_OPTIONS = [
    { label: 'All', value: '' },
    { label: 'Success', value: 'success' },
    { label: 'Pending', value: 'pending' },
    { label: 'Processing', value: 'processing' },
    { label: 'Failed', value: 'failed' },
    { label: 'Ignored', value: 'ignored' },
];

const STATUS_TONE = {
    success: 'success',
    pending: 'attention',
    processing: 'info',
    failed: 'critical',
    ignored: 'subdued',
};

function formatDate(value) {
    if (!value) return '—';

    return new Date(value).toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

function humanize(value) {
    if (!value) return '—';

    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function StatusBadge({ status }) {
    return (
        <Badge tone={STATUS_TONE[status] ?? 'subdued'}>
            {humanize(status)}
        </Badge>
    );
}

function SummaryCard({ title, value, helper, tone = 'default' }) {
    const colors = {
        default: '#202223',
        success: '#008060',
        attention: '#B98900',
        critical: '#D72C0D',
        info: '#2C6ECB',
    };

    return (
        <Card>
            <BlockStack gap="150">
                <Text as="p" variant="bodySm" tone="subdued">
                    {title}
                </Text>

                <Text as="p" variant="headingLg" fontWeight="bold">
                    <span style={{ color: colors[tone] ?? colors.default }}>
                        {value}
                    </span>
                </Text>

                <Text as="p" variant="bodySm" tone="subdued">
                    {helper}
                </Text>
            </BlockStack>
        </Card>
    );
}

export default function Index({ events, filters = {} }) {
    const items = events?.data ?? [];

    const initialTab = useMemo(() => {
        if (filters.group === 'Products') return 1;
        if (filters.group === 'Orders') return 2;
        return 0;
    }, [filters.group]);

    const [selectedTab, setSelectedTab] = useState(initialTab);
    const [queryValue, setQueryValue] = useState(filters.search ?? '');
    const [statusValue, setStatusValue] = useState(filters.status ?? '');
    const [sortSelected, setSortSelected] = useState(['received_at desc']);

    const { mode, setMode } = useSetIndexFiltersMode();

    const sortOptions = [
        { label: 'Newest first', value: 'received_at desc' },
        { label: 'Oldest first', value: 'received_at asc' },
        { label: 'Status', value: 'status asc' },
    ];

    const currentGroup = selectedTab === 1 ? 'Products' : selectedTab === 2 ? 'Orders' : '';

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

            const group = index === 1 ? 'Products' : index === 2 ? 'Orders' : '';
            applyFilters({ group, page: 1 });
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

    const rowMarkup = items.map((event, index) => (
          <IndexTable.Row id={String(event.id)} key={event.id} position={index}>
        <IndexTable.Cell>
            <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center" wrap>
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                        {event.topic}
                    </Text>
                </InlineStack>

                <Text as="span" variant="bodySm" tone="subdued">
                    Event #{event.id} · {event.group ?? '-'} · {event.action ?? '-'}
                </Text>
            </BlockStack>
        </IndexTable.Cell>

        <IndexTable.Cell>
            <StatusBadge status={event.status} />
        </IndexTable.Cell>

        <IndexTable.Cell>
            {event.attempts ?? 0}
        </IndexTable.Cell>

        <IndexTable.Cell>
            {formatDate(event.received_at)}
        </IndexTable.Cell>

        <IndexTable.Cell>
            <Link href={route('webhook-events.show', event.id)}>
                View
            </Link>
        </IndexTable.Cell>
    </IndexTable.Row>
    ));

    return (
        <>
            <Head title="Webhook Events" />

            <Page
                title="Webhook Events"
                subtitle="Review Shopify webhook deliveries, processing state, and event details."
                primaryAction={{
                    content: 'Refresh',
                    onAction: () =>
                        router.get(route('webhook-events.index'), {
                            search: queryValue || undefined,
                            status: statusValue || undefined,
                            group: currentGroup || undefined,
                            page: events?.current_page ?? 1,
                        }, {
                            preserveState: true,
                            preserveScroll: true,
                            replace: true,
                        }),
                }}
            >
                <BlockStack gap="500">
                    <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
                        <SummaryCard
                            title="Showing"
                            value={summary.total}
                            helper="Events on this page"
                            tone="info"
                        />
                        <SummaryCard
                            title="Success"
                            value={summary.success}
                            helper="Processed successfully"
                            tone="success"
                        />
                        <SummaryCard
                            title="Pending"
                            value={summary.pending}
                            helper="Waiting or processing"
                            tone="attention"
                        />
                        <SummaryCard
                            title="Failed"
                            value={summary.failed}
                            helper="Need review"
                            tone={summary.failed > 0 ? 'critical' : 'default'}
                        />
                    </InlineGrid>

                    <Card padding="0">
                        <Tabs tabs={TABS} selected={selectedTab} onSelect={handleTabChange} />

                        <Box padding="300">
                            <IndexFilters
                                sortOptions={sortOptions}
                                sortSelected={sortSelected}
                                queryValue={queryValue}
                                queryPlaceholder="Search topic, shop, webhook ID"
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
                                onSelect={() => {}}
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
                                    onAction: () => {},
                                }}
                                onQuerySubmit={handleFiltersQuerySubmit}
                                promotedBulkActions={promotedBulkActions}
                            />
                        </Box>

                        {items.length > 0 ? (
                            <>
                                <IndexTable
                                    resourceName={{ singular: 'webhook event', plural: 'webhook events' }}
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
                                            onPrevious={() => applyFilters({ page: (events?.current_page ?? 1) - 1 })}
                                            hasNext={Boolean(events?.next_page_url)}
                                            onNext={() => applyFilters({ page: (events?.current_page ?? 1) + 1 })}
                                            label={`${events?.from ?? 0}-${events?.to ?? 0} of ${events?.total ?? 0}`}
                                        />
                                    </InlineStack>
                                </Box>
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
                        )}
                    </Card>
                </BlockStack>
            </Page>
        </>
    );
}