import type { Product } from '@coveo/headless/commerce';
import { LOCALE } from './commerceEngine';
import { SEARCH_VIEW_URL } from './storefrontConfig';

/**
 * Resolves a single product by id straight from the Commerce API.
 *
 * WHY THIS EXISTS
 * ---------------
 * The product page used to resolve a product that wasn't already in the shared
 * search results by pushing its id through the SHARED search box + controller.
 * That raced with `ensureFirstSearch()` (the same mount fired up to three
 * searches into one shared slice), so whichever response landed last won — and
 * when that was the empty-query search, the product was never in the results and
 * the page showed "Product not found". It also overwrote the visible header
 * search box with the product id.
 *
 * A direct call is independent of all that shared state:
 *   - no race with other searches,
 *   - no side effect on the header search box or the grid's results,
 *   - no analytics events (the Commerce API itself emits none; events come from
 *     Headless controllers, which we deliberately bypass for a plain lookup).
 *
 * Matching is by exact `permanentid` (falling back to `ec_product_id`), so a
 * search that merely returns similar products is not mistaken for a hit.
 */
const ORG_ID = '__COVEO_ORG_ID__';
const TRACKING_ID = 'chbi-shop';
const ACCESS_TOKEN = import.meta.env.VITE_COVEO_ACCESS_TOKEN as string;

export async function fetchProductById(
  id: string,
  signal?: AbortSignal,
): Promise<Product | undefined> {
  const resp = await fetch(
    `https://${ORG_ID}.org.coveo.com/rest/organizations/${ORG_ID}/commerce/v2/search`,
    {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trackingId: TRACKING_ID,
        clientId: crypto.randomUUID(),
        language: LOCALE.language,
        country: LOCALE.country,
        currency: LOCALE.currency,
        query: id,
        context: { view: { url: SEARCH_VIEW_URL } },
        page: 0,
        perPage: 10,
      }),
    },
  );
  if (!resp.ok) {
    throw new Error(`Product lookup failed: HTTP ${resp.status}`);
  }
  const data = (await resp.json()) as { products?: Product[] };
  return (data.products ?? []).find(
    (p) =>
      p.permanentid === id ||
      (p as unknown as { ec_product_id?: string }).ec_product_id === id,
  );
}
