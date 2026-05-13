import { Card, BlockStack, Text } from '@shopify/polaris';

export default function SummaryCard({ title, value, description, tone }) {
    return (
        <Card>
            <BlockStack gap="100">
                <Text as="p" variant="bodySm" tone="subdued">{title}</Text>
                <Text as="p" variant="headingXl" fontWeight="bold" tone={tone ?? undefined}>
                    {value ?? 0}
                </Text>
                {description && (
                    <Text as="p" variant="bodySm" tone="subdued">{description}</Text>
                )}
            </BlockStack>
        </Card>
    );
}
