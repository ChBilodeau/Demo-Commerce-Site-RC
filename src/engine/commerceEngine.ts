import {
  buildCommerceEngine,
  type CommerceEngine,
  type CommerceEngineConfiguration,
} from '@coveo/headless/commerce';
import { loadCartItems } from './cartStorage';
import { SEARCH_VIEW_URL } from './storefrontConfig';
import { demoConfig } from '../config/demoConfig';

/**
 * Coveo Headless Commerce engine configuration for the CHBI org.
 *
 * ── Pipeline & catalog routing ───────────────────────────────────────────────
 * Unlike the Search API, the Commerce API does NOT take a pipeline or catalogId
 * from the client. The query pipeline and catalog are selected server-side via
 * the storefront association tied to the trackingId below. Make sure a
 * storefront association for your configured trackingId exists in the Coveo
 * admin and points at the right pipeline / catalog.
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

const ACCESS_TOKEN = demoConfig.coveo.accessToken;

/**
 * The storefront locale. MUST match the locale on the Coveo storefront
 * association. Read from demo.config.json so UI code (e.g. price formatting)
 * uses the same language/currency the engine queries with.
 */
export const LOCALE = demoConfig.coveo.commerce.locale;

export const commerceConfiguration: CommerceEngineConfiguration = {
  organizationId: demoConfig.coveo.organizationId,
  accessToken: ACCESS_TOKEN,
  analytics: {
    // Coveo for Commerce uses the Event Protocol (EP), which is built into
    // @coveo/headless v3. analyticsMode defaults to 'next' (EP via the Relay
    // library) and enabled defaults to true, so search, productClick, and
    // productView events are emitted automatically by the controllers.
    enabled: true,
    trackingId: demoConfig.coveo.commerce.trackingId,
  },
  context: {
    // Must match the storefront association's locale (en-CA-CAD) in the Coveo
    // admin, otherwise the Commerce API returns 412 NO_CATALOG_MATCHES_REQUEST.
    language: LOCALE.language,
    country: LOCALE.country,
    // Config currency is a plain string from JSON; the engine wants the ISO
    // 4217 union. Cast it — validity is the user's responsibility (documented).
    currency: LOCALE.currency as CommerceEngineConfiguration['context']['currency'],
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
