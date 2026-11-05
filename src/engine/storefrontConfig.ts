/**
 * Single source of truth for the storefront base URL used in Coveo analytics
 * (`context.view.url`) and in product-listing page (PLP) URL resolution.
 *
 * WHY THIS EXISTS
 * ---------------
 * The analytics Event Protocol expects `view.url` to be the REAL page the user
 * is on. If this carries a fake, unresolvable URL, the logged events can fail
 * to render an expandable payload in the Coveo analytics event browser. Sending
 * the real runtime origin fixes that.
 *
 * PLP CAVEAT
 * ----------
 * A listing page configured in the Commerce Merchandising Hub (CMH) is matched
 * by its exact Page URL. Set `storefront.baseUrl` in demo.config.json to the
 * exact base your PLPs are registered against so PLP matching keeps working,
 * OR register the PLPs against the origin you actually serve from.
 *
 * Resolution order:
 *   1. demo.config.json storefront.baseUrl  (explicit override, if set)
 *   2. window.location.origin               (the real runtime origin — default)
 *   3. 'http://localhost:5173'              (SSR/test fallback, no window)
 */
import { demoConfig } from '../config/demoConfig';

function resolveBaseUrl(): string {
  const override = demoConfig.storefront.baseUrl;
  if (override && override.trim()) {
    return override.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5173';
}

/** Storefront origin, e.g. "http://localhost:5175" or your production origin. */
export const STOREFRONT_BASE_URL = resolveBaseUrl();

/** The analytics view URL for the storefront search root (home). */
export const SEARCH_VIEW_URL = `${STOREFRONT_BASE_URL}/`;

/** Builds the analytics/PLP view URL for a listing path like "/Cars/Trucks". */
export function buildListingUrl(path: string): string {
  const clean = path.replace(/^\/+/, '');
  return `${STOREFRONT_BASE_URL}/browse/${clean}`;
}

