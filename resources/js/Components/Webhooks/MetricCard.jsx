import { Card, BlockStack, Text } from '@shopify/polaris';

const COLORS = {
    default: '#202223',
    success: '#008060',
    critical: '#D72C0D',
    warning: '#B98900',
    attention: '#B98900',
    info: '#2C6ECB',
    subdued: '#6D7175',
};

export default function MetricCard({ title, value, helper, tone = 'default' }) {
    return (
        <Card>
            <BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">
                    {title}
                </Text>

                <Text as="p" variant="headingXl" fontWeight="bold">
                    <span style={{ color: COLORS[tone] ?? COLORS.default }}>
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
