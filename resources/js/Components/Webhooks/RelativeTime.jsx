import { InlineStack, Text, Tooltip } from '@shopify/polaris';
import { timeAgo, formatFullDate } from './utils';

export default function RelativeTime({ value, prefix = '' }) {
    if (!value) {
        return (
            <Text as="span" variant="bodySm" tone="subdued">
                —
            </Text>
        );
    }

    return (
        <Tooltip content={formatFullDate(value)}>
            <Text as="span" variant="bodySm" tone="subdued">
                {prefix}{timeAgo(value)}
            </Text>
        </Tooltip>
    );
}
