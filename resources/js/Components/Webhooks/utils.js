/**
 * Shared utility functions for the Webhook Monitor UI.
 * Consolidates duplicated helpers from Dashboard, Events, and Subscriptions pages.
 */

const STATUS_TONES = {
    pending: 'attention',
    processing: 'info',
    success: 'success',
    failed: 'critical',
    ignored: 'subdued',
    replayed: 'warning',
};

const HEALTH_TONES = {
    healthy: 'success',
    warning: 'attention',
    critical: 'critical',
};

const SUBSCRIPTION_STATUS_TONES = {
    active: 'success',
    inactive: 'attention',
    failed: 'critical',
    deleted: 'subdued',
    missing_on_shopify: 'warning',
    unsupported: 'subdued',
};

const TRIGGER_LABELS = {
    automatic: 'Automatic',
    manual_replay: 'Manual replay',
};

/**
 * Convert snake_case / raw string to Title Case.
 */
function humanize(value) {
    if (!value) return '—';

    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Return a relative time string like "2 min ago", "1 hr ago", "3 days ago".
 * Falls back to a short formatted date for older timestamps.
 */
function timeAgo(value) {
    if (!value) return '—';

    const date = new Date(value);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? 's' : ''} ago`;
    if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;

    return formatDate(value);
}

/**
 * Format a date/time value to a short human-readable string.
 * Uses 12-hour format consistently.
 */
function formatDate(value) {
    if (!value) return '—';

    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Format a full date/time for tooltips.
 */
function formatFullDate(value) {
    if (!value) return '—';

    return new Date(value).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    });
}

/**
 * Format milliseconds to a human-readable duration string.
 */
function formatMs(value) {
    if (value == null) return '—';

    return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`;
}

/**
 * Calculate percentage safely.
 */
function percent(value, total) {
    if (!total || total <= 0) return 0;

    return Math.round((Number(value || 0) / Number(total)) * 100);
}

/**
 * Get the tone/color for a webhook event status.
 */
function getStatusTone(status) {
    return STATUS_TONES[status] ?? 'subdued';
}

/**
 * Copy text to clipboard and return a promise.
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

export {
    STATUS_TONES,
    HEALTH_TONES,
    SUBSCRIPTION_STATUS_TONES,
    TRIGGER_LABELS,
    humanize,
    timeAgo,
    formatDate,
    formatFullDate,
    formatMs,
    percent,
    getStatusTone,
    copyToClipboard,
};
