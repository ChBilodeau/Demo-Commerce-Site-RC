import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  buildRecommendations,
  type Recommendations,
  type Product,
} from '@coveo/headless/commerce';
import { commerceEngine } from '../engine/commerceEngine';
import { addToCart } from '../engine/cartController';
import { formatPrice } from '../utils/format';

interface RecommendationCarouselProps {
  slotId: string;
  /** Optional product id to seed recommendations (e.g. on a PDP). */
  productId?: string;
  /** Shown if the slot's own headline is empty. */
  fallbackTitle: string;
}

function recPrice(p: Product): number | null {
  return p.ec_promo_price ?? p.ec_price;
}

export function RecommendationCarousel({
  slotId,
  productId,
  fallbackTitle,
}: RecommendationCarouselProps) {
  // Build the controller once per slot. If no slotId is configured yet, skip.
  const controllerRef = useRef<Recommendations | null>(null);
  if (slotId && !controllerRef.current) {
    controllerRef.current = buildRecommendations(commerceEngine, {
      options: { slotId, productId },
    });
  }
  const controller = controllerRef.current;

  const [state, setState] = useState(() => controller?.state);

  useEffect(() => {
    if (!controller) return;
    const unsub = controller.subscribe(() => setState(controller.state));
    controller.refresh();
    return unsub;
  }, [controller]);

  // Nothing to show: no slot configured, still loading first time, or empty.
  if (!controller || !state) return null;
  if (state.error) return null;
  if (state.products.length === 0) return null;

  const title = state.headline || fallbackTitle;

  const logClick = (product: Product) => {
    controller.interactiveProduct({ options: { product } }).select();
  };

  const onAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    // Attribution: log the rec productClick (carries the rec slot responseId)
    // before the cart add, so the purchase credits the recommendation surface.
    logClick(product);
    addToCart({
      productId: product.permanentid,
      name: product.ec_name ?? 'Untitled product',
      price: recPrice(product) ?? 0,
      image: product.ec_images?.[0],
    });
  };

  return (
    <section className="rec-carousel" aria-label={title}>
      <h2 className="rec-title">{title}</h2>
      <div className="rec-track">
        {state.products.map((product) => {
          const image = product.ec_images?.[0];
          return (
            <Link
              key={product.permanentid}
              to={`/product/${encodeURIComponent(product.permanentid)}`}
              className="rec-card"
              onClick={() => logClick(product)}
            >
              <div className="rec-image">
                {image ? (
                  <img src={image} alt={product.ec_name ?? 'Product'} loading="lazy" />
                ) : (
                  <div className="product-image-placeholder" aria-hidden="true">
                    No image
                  </div>
                )}
              </div>
              <span className="rec-name">{product.ec_name ?? 'Untitled product'}</span>
              <span className="rec-price">{formatPrice(recPrice(product))}</span>
              <button
                type="button"
                className="add-to-cart-btn rec-add"
                onClick={(e) => onAdd(e, product)}
              >
                Add to cart
              </button>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
