import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { buildProductView, type Product } from '@coveo/headless/commerce';
import { commerceEngine } from '../engine/commerceEngine';
import { searchController } from '../engine/searchController';
import { fetchProductById } from '../engine/productLookup';
import { addToCart } from '../engine/cartController';
import { formatPrice as format } from '../utils/format';

// Controller that logs the Coveo `ec.productView` analytics event (Event
// Protocol) when a shopper opens a product detail page.
const productView = buildProductView(commerceEngine);

/** Renders the product rating (0–10 scale) as a 5-star display. */
function Rating({ value }: { value: number }) {
  const outOfFive = value / 2;
  const full = Math.round(outOfFive);
  return (
    <span className="product-rating" aria-label={`Rated ${outOfFive.toFixed(1)} out of 5`}>
      <span aria-hidden="true">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>
      <span className="product-rating-value">{outOfFive.toFixed(1)}</span>
    </span>
  );
}

/** Where "Back" should return, based on where the shopper navigated from. */
function useBackTarget(): { to: string; label: string } {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  if (from === 'cpd') {
    return { to: '/discover', label: '← Back to Try CPD!' };
  }
  return { to: '/', label: '← Back to products' };
}

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const back = useBackTarget();
  const [state, setState] = useState(searchController.state);

  // Tracks the product id we've already logged a view for, so we don't send a
  // duplicate ec.productView (React StrictMode double-mounts effects in dev,
  // and the state subscription re-renders this component on every update).
  const loggedViewFor = useRef<string | null>(null);

  // Keep in sync with the shared search results so that when the shopper came
  // from the grid, the product is available instantly with no extra request.
  useEffect(() => {
    return searchController.subscribe(() => setState(searchController.state));
  }, []);

  const fromResults: Product | undefined = state.products.find(
    (p) => p.permanentid === id,
  );

  // Fallback for arrivals that bypass the grid (CPD cards, Ask Coveo AI cards,
  // deep links, hard refresh). Resolve the product directly from the Commerce
  // API instead of via the shared search slice — see productLookup.ts for why
  // the old shared-search approach raced and produced "Product not found".
  // `lookup` is keyed by id so a stale result for a previous id is never shown.
  const [lookup, setLookup] = useState<{
    id: string;
    product?: Product;
    done: boolean;
  } | null>(null);

  useEffect(() => {
    if (!id || fromResults) return;
    const controller = new AbortController();
    setLookup({ id, done: false });
    fetchProductById(id, controller.signal)
      .then((found) => setLookup({ id, product: found, done: true }))
      .catch((err) => {
        if (controller.signal.aborted) return; // unmounted / id changed
        // eslint-disable-next-line no-console
        console.error('[ProductPage] lookup failed', err);
        setLookup({ id, done: true });
      });
    return () => controller.abort();
    // Intentionally keyed on id + whether results already had it.
  }, [id, Boolean(fromResults)]); // eslint-disable-line react-hooks/exhaustive-deps

  const lookedUp = lookup && lookup.id === id ? lookup : null;
  const product: Product | undefined = fromResults ?? lookedUp?.product;

  // Log the product view once the product is resolved.
  useEffect(() => {
    if (!product || loggedViewFor.current === product.permanentid) {
      return;
    }
    loggedViewFor.current = product.permanentid;
    productView.view({
      productId: product.permanentid,
      name: product.ec_name ?? '',
      price: product.ec_promo_price ?? product.ec_price ?? 0,
    });
  }, [product]);

  // Loading until the direct lookup has finished. "Not found" is only shown
  // after a completed lookup that genuinely returned no match.
  if (!product && !lookedUp?.done) {
    return <div className="grid-status">Loading product…</div>;
  }

  if (!product) {
    return (
      <div className="product-detail-missing">
        <p className="grid-status">Product not found.</p>
        <Link to={back.to} className="back-link">{back.label}</Link>
      </div>
    );
  }

  const image = product.ec_images?.[0];
  const hasPromo =
    product.ec_promo_price != null &&
    product.ec_price != null &&
    product.ec_promo_price < product.ec_price;

  return (
    <div className="product-detail">
      <Link to={back.to} className="back-link">{back.label}</Link>

      <div className="product-detail-body">
        <div className="product-detail-image">
          {image ? (
            <img src={image} alt={product.ec_name ?? 'Product'} />
          ) : (
            <div className="product-image-placeholder" aria-hidden="true">
              No image
            </div>
          )}
        </div>

        <div className="product-detail-info">
          {product.ec_brand && (
            <p className="product-detail-brand">{product.ec_brand}</p>
          )}
          <h1 className="product-detail-name">
            {product.ec_name ?? 'Untitled product'}
          </h1>

          <div className="product-detail-price">
            {hasPromo ? (
              <>
                <span className="price-current">{format(product.ec_promo_price)}</span>
                <span className="price-original">{format(product.ec_price)}</span>
              </>
            ) : (
              <span className="price-current">{format(product.ec_price)}</span>
            )}
          </div>

          <div className="product-detail-meta">
            {product.ec_rating != null && <Rating value={product.ec_rating} />}
            {product.ec_in_stock != null && (
              <span
                className={`stock-badge ${product.ec_in_stock ? 'in-stock' : 'out-of-stock'}`}
              >
                {product.ec_in_stock ? 'In stock' : 'Out of stock'}
              </span>
            )}
          </div>

          {(product.ec_category?.length ?? 0) > 0 && (
            <p className="product-detail-category">
              {product.ec_category[product.ec_category.length - 1].replace(/\|/g, ' › ')}
            </p>
          )}

          {product.ec_description && (
            <p className="product-detail-description">{product.ec_description}</p>
          )}

          <button
            type="button"
            className="add-to-cart-btn add-to-cart-btn-lg"
            onClick={() =>
              addToCart({
                productId: product.permanentid,
                name: product.ec_name ?? 'Untitled product',
                price: product.ec_promo_price ?? product.ec_price ?? 0,
                image: product.ec_images?.[0],
              })
            }
          >
            Add to cart
          </button>

          <p className="product-detail-sku">
            SKU: {(product.additionalFields?.cat_sku as string) ?? `FA-${product.permanentid}`}
          </p>
        </div>
      </div>
    </div>
  );
}
