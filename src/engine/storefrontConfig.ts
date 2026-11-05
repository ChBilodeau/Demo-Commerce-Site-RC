/**
 * Single source of truth for the storefront base URL used in Coveo analytics
 * (`context.view.url`) and in product-listing page (PLP) URL resolution.
 *
 * WHY THIS EXISTS
 * ---------------
 * The analytics Event Protocol expects `view.url` to be the REAL page the user
 * is on. Previously this was hardcoded to a placeholder
 * (`https://chbi-shop.example.com`), which made the logged events carry a fake,
 * unresolvable URL — in the Coveo analytics event browser those events can fail
 * to render an expandable payload. Sending the real URL fixes that.
 *
 * PLP CAVEAT
 * ----------
 * A listing page configured in the Commerce Merchandising Hub (CMH) is matched
 * by its exact Page URL. If your PLPs were registered against the old
 * placeholder base, point VITE_STOREFRONT_BASE_URL at that same base so PLP
 * matching keeps working, OR re-register the PLPs against the real origin.
 *
 * Resolution order:
 *   1. VITE_STOREFRONT_BASE_URL  (explicit override, if set)
 *   2. window.location.origin    (the real runtime origin — the default)
 *   3. 'http://localhost:5173'   (SSR/test fallback when there is no window)
 */
function resolveBaseUrl(): string {
  const override = import.meta.env.VITE_STOREFRONT_BASE_URL as string | undefined;
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

