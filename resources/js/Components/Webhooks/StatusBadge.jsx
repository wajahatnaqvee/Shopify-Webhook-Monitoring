import { Badge } from '@shopify/polaris';
import { humanize, getStatusTone } from './utils';

export default function StatusBadge({ status }) {
    return (
        <Badge tone={getStatusTone(status)}>
            {humanize(status)}
        </Badge>
    );
}
