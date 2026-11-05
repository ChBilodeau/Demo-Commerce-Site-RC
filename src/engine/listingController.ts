import {
  buildProductListing,
  buildContext,
  type ProductListing,
  type Sort,
  type Pagination,
  type FacetGenerator,
} from '@coveo/headless/commerce';
import { commerceEngine } from './commerceEngine';
import { markViewMovedAwayFromSearch } from './searchController';
import { buildListingUrl } from './storefrontConfig';

const context = buildContext(commerceEngine);

// A PLP in the CMH is matched by its full Page URL, which MUST exactly equal the
// view.url the client sends. The URL is built by buildListingUrl() in
// storefrontConfig as `${STOREFRONT_BASE_URL}/browse/<path>`. If your PLPs were
// registered against the old placeholder base, set VITE_STOREFRONT_BASE_URL to
// that base so matching keeps working, or re-register the PLPs.

export interface ListingControllers {
  listing: ProductListing;
  sort: Sort;
  pagination: Pagination;
  facetGenerator: FacetGenerator;
}

let current: ListingControllers | null = null;

/**
 * Builds (once) the ProductListing controller and its sub-controllers, and
 * points the engine context at the given listing path so the Commerce API
 * resolves the correct CMH-configured listing page.
 *
 * The listing path looks like "/Sandals_Shoes/Sandals" (from the ec_listing
 * field). We set it on the shared context's view URL before fetching.
 */
export function getListingControllers(path: string): ListingControllers {
  // Repointing the shared context away from the search root; the search view
  // must re-establish its root view the next time it mounts.
  markViewMovedAwayFromSearch();
  context.setView({ url: buildListingUrl(path) });

  if (!current) {
    const listing = buildProductListing(commerceEngine);
    current = {
      listing,
      sort: listing.sort(),
      pagination: listing.pagination(),
      facetGenerator: listing.facetGenerator(),
    };
  }

  current.listing.executeFirstRequest();
  return current;
}

/** Refreshes the listing after the view URL changes (navigating between PLPs). */
export function refreshListing(path: string): void {
  markViewMovedAwayFromSearch();
  context.setView({ url: buildListingUrl(path) });
  current?.listing.refresh();
}
