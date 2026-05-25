import '../css/app.css';
import '@shopify/polaris/build/esm/styles.css';
import './bootstrap';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';

// Keep track of the current shop domain so we can attach it to every
// Inertia request as X-Shop-Domain. This allows VerifyShopify middleware
// to identify the shop even when the URL has no ?shop= param (e.g. after
// Inertia SPA navigation strips query params).
let currentShopDomain = null;

// Seed from initial page data embedded in the <div id="app"> element.
try {
    const el = document.getElementById('app');
    if (el) {
        const page = JSON.parse(el.dataset.page ?? '{}');
        currentShopDomain = page?.props?.auth?.shop_domain ?? null;
    }
} catch {
    // Non-critical — will be updated on the first 'navigate' event.
}

// Keep the domain fresh on every full-page Inertia navigation.
router.on('navigate', (event) => {
    const shopDomain = event.detail?.page?.props?.auth?.shop_domain;
    if (shopDomain) {
        currentShopDomain = shopDomain;
    }
});

// Attach X-Shop-Domain to every Inertia request.
router.on('before', (event) => {
    if (currentShopDomain) {
        event.detail.visit.headers ??= {};
        event.detail.visit.headers['X-Shop-Domain'] = currentShopDomain;
    }
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <AppProvider i18n={enTranslations}>
                <App {...props} />
            </AppProvider>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});
