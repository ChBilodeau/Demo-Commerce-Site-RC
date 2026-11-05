import {
  buildCommerceEngine,
  type CommerceEngine,
  type CommerceEngineConfiguration,
} from '@coveo/headless/commerce';
import { loadCartItems } from './cartStorage';
import { SEARCH_VIEW_URL } from './storefrontConfig';

/**
 * Coveo Headless Commerce engine configuration for the CHBI org.
 *
 * ── Pipeline & catalog routing ───────────────────────────────────────────────
 * Unlike the Search API, the Commerce API does NOT take a pipeline or catalogId
 * from the client. The query pipeline (CHBI - Commerce) and catalog
 * (ba1e8e1d-06df-4c61-b096-dded9ba9e8d1) are selected server-side via the
 * storefront association tied to the trackingId below. Make sure a storefront
 * association for trackingId "chbi-shop" exists in the Coveo admin and points
 * at the CHBI - Commerce pipeline / catalog.
 *
 * NOTE: trackingId must match /^[a-zA-Z0-9_\-.]{1,100}$/ — no spaces allowed.
 * It is an identifier, not a display name.
 *
 * ── Access token ─────────────────────────────────────────────────────────────
 * Replace ACCESS_TOKEN with a search token or API key that grants the
 * "Execute queries" privilege (and "Push" on Analytics data) for this org.
 * Do not commit a real API key to source control — prefer a short-lived search
 * token, or load it from an environment variable.
 */

const ACCESS_TOKEN = import.meta.env.VITE_COVEO_ACCESS_TOKEN as string;

if (!ACCESS_TOKEN) {
  throw new Error(
    'Missing VITE_COVEO_ACCESS_TOKEN. Copy .env.example to .env.local and add your Coveo access token.',
  );
}

/**
 * The storefront locale. This MUST match the locale on the Coveo storefront
 * association (currently en-CA-CAD). It's exported so UI code (e.g. price
 * formatting) uses the same language/currency the engine queries with.
 */
export const LOCALE = {
  language: 'en',
  country: 'CA',
  currency: 'CAD',
} as const;

export const commerceConfiguration: CommerceEngineConfiguration = {
  organizationId: '__COVEO_ORG_ID__',
  accessToken: ACCESS_TOKEN,
  analytics: {
    // Coveo for Commerce uses the Event Protocol (EP), which is built into
    // @coveo/headless v3. analyticsMode defaults to 'next' (EP via the Relay
    // library) and enabled defaults to true, so search, productClick, and
    // productView events are emitted automatically by the controllers — no
    // separate "Coveo UA" (legacy coveoua) library is needed or recommended.
    // Both are set explicitly here to document intent.
    enabled: true,
    trackingId: 'chbi-shop',
  },
  context: {
    // Must match the storefront association's locale (en-CA-CAD) in the Coveo
    // admin, otherwise the Commerce API returns 412 NO_CATALOG_MATCHES_REQUEST.
    language: LOCALE.language,
    country: LOCALE.country,
    currency: LOCALE.currency,
    view: {
      // Real storefront URL (not a placeholder) so Event Protocol events carry
      // a resolvable page URL and render correctly in the analytics browser.
      url: SEARCH_VIEW_URL,
    },
  },
  // Restore the shopper's cart from localStorage so it survives page reloads.
  cart: {
    items: loadCartItems(),
  },
};

export const commerceEngine: CommerceEngine = buildCommerceEngine({
  configuration: commerceConfiguration,
});
