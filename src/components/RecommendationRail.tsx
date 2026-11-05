import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  buildRecommendations,
  type Recommendations,
  type Product,
} from '@coveo/headless/commerce';
import { commerceEngine } from '../engine/commerceEngine';
import { formatPrice } from '../utils/format';

interface RecommendationRailProps {
  slotId: string;
  fallbackTitle: string;
  /** How many product tiles to show in the rail. */
  count?: number;
}

function recPrice(p: Product): number | null {
  return p.ec_promo_price ?? p.ec_price;
}

/**
 * A vertical recommendations rail: a titled panel containing a few stacked
 * product tiles. Driven by a CMH recommendation slot. Hides itself when the
 * slot returns nothing (e.g. the PR model hasn't trained yet).
 */
export function RecommendationRail({
  slotId,
  fallbackTitle,
  count = 3,
}: RecommendationRailProps) {
  const controllerRef = useRef<Recommendations | null>(null);
  if (slotId && !controllerRef.current) {
    controllerRef.current = buildRecommendations(commerceEngine, {
      options: { slotId },
    });
  }
  const controller = controllerRef.current;

  const [state, setState] = useState(() => controller?.state);

  useEffect(() => {
    if (!controller) return;
    const unsub = controller.subscribe(() => {
      const s = controller.state;
      if (import.meta.env.VITE_RECS_DEBUG === 'true') {
        // eslint-disable-next-line no-console
        console.log('[recs]', slotId, {
          loading: s.isLoading,
          error: s.error,
          headline: s.headline,
          products: s.products.length,
        });
      }
      setState(s);
    });
    controller.refresh();
    return unsub;
  }, [controller, slotId]);

  if (!controller || !state || state.error) return null;
  if (state.products.length === 0) return null;

  const title = state.headline || fallbackTitle;
  const products = state.products.slice(0, count);

  const logClick = (product: Product) => {
    controller.interactiveProduct({ options: { product } }).select();
  };

  return (
    <aside className="rec-rail" aria-label={title}>
      <h2 className="rec-rail-title">{title}</h2>
      <div className="rec-rail-items">
        {products.map((product) => {
          const image = product.ec_images?.[0];
          return (
            <Link
              key={product.permanentid}
              to={`/product/${encodeURIComponent(product.permanentid)}`}
              className="rec-rail-item"
              onClick={() => logClick(product)}
            >
              <div className="rec-rail-image">
                {image ? (
                  <img src={image} alt={product.ec_name ?? 'Product'} loading="lazy" />
                ) : (
                  <div className="product-image-placeholder" aria-hidden="true">
                    No image
                  </div>
                )}
              </div>
              <div className="rec-rail-info">
                <span className="rec-rail-name">{product.ec_name ?? 'Untitled product'}</span>
                {product.ec_brand && (
                  <span className="rec-rail-brand">{product.ec_brand}</span>
                )}
                <span className="rec-rail-price">{formatPrice(recPrice(product))}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
