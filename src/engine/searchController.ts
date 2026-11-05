import {
  buildSearch,
  buildContext,
  type Search,
  type Sort,
  type Pagination,
  type FacetGenerator,
} from '@coveo/headless/commerce';
import { commerceEngine } from './commerceEngine';
import { SEARCH_VIEW_URL } from './storefrontConfig';

/**
 * A single shared `Search` controller instance.
 *
 * Both the product grid and the product detail page import this so they read
 * from the same product list and log analytics against the same response.
 */
export const searchController: Search = buildSearch(commerceEngine);

// Shared sort, pagination, and facet sub-controllers for the search results.
export const searchSort: Sort = searchController.sort();
export const searchPagination: Pagination = searchController.pagination();
export const searchFacetGenerator: FacetGenerator = searchController.facetGenerator();

// The Search and ProductListing controllers share one engine + context. When
// the user browses a listing page, the context view URL is pointed at that
// listing. The search view must reset the context to the storefront root so an
// empty search returns the full catalog — but ONLY when the view was actually
// moved by a listing page. `setView` is a hard reset of the search slice
// (products + facets), so calling it on every mount would wipe an in-progress
// facet selection and re-run an unfiltered search. See `markViewMovedAwayFromSearch`.
const context = buildContext(commerceEngine);

// Tracks whether the shared context view currently points at the search root.
// Starts false so the first ensureFirstSearch() sets the view + runs the search.
let viewIsSearchRoot = false;

/**
 * Called by the listing controller when it repoints the shared context at a
 * listing URL. This tells the search view it must re-establish the search-root
 * view (and re-query) the next time it mounts.
 */
export function markViewMovedAwayFromSearch(): void {
  viewIsSearchRoot = false;
}

/**
 * Prepares the search view. Idempotent: only resets the context + runs the
 * search when the view isn't already at the search root (i.e. first load, or
 * returning from a listing page). On a normal re-render — including after a
 * facet selection — this is a no-op, so it never clobbers filtered state.
 */
export function ensureFirstSearch(): void {
  if (viewIsSearchRoot) {
    return;
  }
  viewIsSearchRoot = true;
  context.setView({ url: SEARCH_VIEW_URL });
  // After setView reset the slice, executeFirstSearch runs because responseId
  // is now empty. (It self-guards against duplicate first searches otherwise.)
  searchController.executeFirstSearch();
}
