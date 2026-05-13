import { Card, BlockStack, Text, Box } from '@shopify/polaris';

export default function JsonViewerCard({ title, data }) {
    return (
        <Card>
            <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                    {title}
                </Text>

                <Box
                    background="bg-surface-secondary"
                    padding="300"
                    borderRadius="200"
                    overflowX="scroll"
                >
                    <pre
                        style={{
                            margin: 0,
                            fontSize: '13px',
                            lineHeight: '1.5',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                        }}
                    >
                        {JSON.stringify(data ?? {}, null, 2)}
                    </pre>
                </Box>
            </BlockStack>
        </Card>
    );
}