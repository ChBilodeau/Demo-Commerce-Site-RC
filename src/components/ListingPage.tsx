import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Product } from '@coveo/headless/commerce';
import {
  getListingControllers,
  refreshListing,
  type ListingControllers,
} from '../engine/listingController';
import { ProductCard } from './ProductCard';
import { Facets } from './Facets';
import { SortControl } from './SortControl';
import { PaginationControl } from './PaginationControl';

function prettyTitle(path: string): string {
  // "/Sandals_Shoes/Sandals" -> "Sandals"
  const last = path.split('/').filter(Boolean).pop() ?? 'Products';
  return last.replace(/_/g, ' ');
}

export function ListingPage() {
  const params = useParams();
  const path = `/${params['*'] ?? ''}`;

  const controllersRef = useRef<ListingControllers | null>(null);
  if (!controllersRef.current) {
    controllersRef.current = getListingControllers(path);
  }
  const { listing, sort, pagination, facetGenerator } = controllersRef.current;

  const [state, setState] = useState(listing.state);
  const [page, setPage] = useState(pagination.state);

  useEffect(() => listing.subscribe(() => setState(listing.state)), [listing]);
  useEffect(() => pagination.subscribe(() => setPage(pagination.state)), [pagination]);

  // When the listing path changes (navigating between PLPs), refetch.
  useEffect(() => {
    refreshListing(path);
  }, [path]);

  const logClick = (product: Product) => {
    listing.interactiveProduct({ options: { product } }).select();
  };

  const promoteChild = (child: Parameters<typeof listing.promoteChildToParent>[0]) => {
    listing.promoteChildToParent(child);
  };

  return (
    <>
      <div className="listing-header">
        <Link to="/" className="back-link">← All products</Link>
        <h1 className="listing-title">{prettyTitle(path)}</h1>
      </div>

      <div className="storefront-layout">
        <Facets facetGenerator={facetGenerator} />

        <div className="product-section">
          {state.error ? (
            <div className="error-banner" role="alert">
              <strong className="error-banner-title">
                Commerce API error ({state.error.statusCode})
              </strong>
              <span className="error-banner-message">{state.error.message}</span>
            </div>
          ) : state.isLoading && state.products.length === 0 ? (
            <div className="grid-status">Loading products…</div>
          ) : state.products.length === 0 ? (
            <div className="grid-status">
              No products found for this listing page.
              <br />
              <span className="grid-status-hint">
                This listing page may not be configured in the Coveo Merchandising Hub yet.
              </span>
            </div>
          ) : (
            <>
              <div className="product-toolbar">
                <div className="product-meta">
                  {page.totalEntries.toLocaleString()} products
                </div>
                <SortControl sort={sort} />
              </div>
              <div className="product-grid">
                {state.products.map((product) => (
                  <ProductCard
                    key={product.permanentid}
                    product={product}
                    onSelect={logClick}
                    onPromoteChild={promoteChild}
                  />
                ))}
              </div>
              <PaginationControl pagination={pagination} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
