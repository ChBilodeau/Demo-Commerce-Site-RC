import { useEffect, useState } from 'react';
import type { Product } from '@coveo/headless/commerce';
import {
  searchController,
  searchSort,
  searchPagination,
  ensureFirstSearch,
} from '../engine/searchController';
import { Link } from 'react-router-dom';
import { ProductCard } from './ProductCard';
import { SortControl } from './SortControl';
import { PaginationControl } from './PaginationControl';
import { getSearchBoxValue } from './SearchBox';

export function ProductGrid() {
  const [state, setState] = useState(searchController.state);
  const [pagination, setPagination] = useState(searchPagination.state);

  // Run/refresh the search whenever the grid mounts. This resets the shared
  // engine context to the storefront root and re-executes, so returning from a
  // listing page (which repoints the context) shows the full catalog again.
  useEffect(() => {
    ensureFirstSearch();
  }, []);

  useEffect(
    () => searchController.subscribe(() => setState(searchController.state)),
    [],
  );
  useEffect(
    () => searchPagination.subscribe(() => setPagination(searchPagination.state)),
    [],
  );

  const logClick = (product: Product) => {
    searchController.interactiveProduct({ options: { product } }).select();
  };

  const promoteChild = (child: Parameters<typeof searchController.promoteChildToParent>[0]) => {
    searchController.promoteChildToParent(child);
  };

  if (state.error) {
    return (
      <div className="error-banner" role="alert">
        <strong className="error-banner-title">
          Commerce API error ({state.error.statusCode})
        </strong>
        <span className="error-banner-message">{state.error.message}</span>
        {state.error.type && (
          <code className="error-banner-type">{state.error.type}</code>
        )}
      </div>
    );
  }

  if (state.isLoading && state.products.length === 0) {
    return <div className="grid-status">Loading products…</div>;
  }

  if (state.products.length === 0) {
    const query = getSearchBoxValue().trim();
    return (
      <div className="grid-status grid-empty">
        <p>No products found.</p>
        {query && (
          <Link
            to="/discover"
            state={{ cpdQuery: query }}
            className="grid-empty-cpd"
          >
            ✨ Try “{query}” in Try CPD!
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="product-section">
      <div className="product-toolbar">
        <div className="product-meta">
          {pagination.totalEntries.toLocaleString()} products
        </div>
        <SortControl sort={searchSort} />
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
      <PaginationControl pagination={searchPagination} />
    </div>
  );
}
