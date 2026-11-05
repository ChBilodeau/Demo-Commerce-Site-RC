import { Link } from 'react-router-dom';
import type { Product, ChildProduct } from '@coveo/headless/commerce';
import { addToCart } from '../engine/cartController';
import { formatPrice } from '../utils/format';

export function productPrice(product: Product | ChildProduct): number | null {
  return product.ec_promo_price ?? product.ec_price;
}

interface ProductCardProps {
  product: Product;
  /** Called when the card is clicked, to log the Coveo productClick event. */
  onSelect?: (product: Product) => void;
  /**
   * Called when a variation swatch is clicked. Should call the controller's
   * `promoteChildToParent(child)` so the selected variation becomes the one
   * displayed on the card.
   */
  onPromoteChild?: (child: ChildProduct) => void;
}

export function ProductCard({ product, onSelect, onPromoteChild }: ProductCardProps) {
  const image = product.ec_images?.[0];
  const hasVariations =
    (product.totalNumberOfChildren ?? 0) > 0 && product.children.length > 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Attribution: log the Coveo productClick (carries the search/listing
    // responseId) BEFORE the cart add, so the resulting purchase credits the
    // surface the product came from (search vs. listing). Coveo uses last-click.
    onSelect?.(product);
    addToCart({
      productId: product.permanentid,
      name: product.ec_name ?? 'Untitled product',
      price: productPrice(product) ?? 0,
      image: product.ec_images?.[0],
    });
  };

  const handleSwatch = (e: React.MouseEvent, child: ChildProduct) => {
    e.preventDefault();
    e.stopPropagation();
    onPromoteChild?.(child);
  };

  return (
    <Link
      to={`/product/${encodeURIComponent(product.permanentid)}`}
      className="product-card"
      onClick={() => onSelect?.(product)}
    >
      <div className="product-image">
        {image ? (
          <img src={image} alt={product.ec_name ?? 'Product'} loading="lazy" />
        ) : (
          <div className="product-image-placeholder" aria-hidden="true">
            No image
          </div>
        )}
      </div>
      <h3 className="product-name">{product.ec_name ?? 'Untitled product'}</h3>
      {product.ec_brand && <p className="product-brand">{product.ec_brand}</p>}
      <p className="product-price">{formatPrice(productPrice(product))}</p>

      {hasVariations && onPromoteChild && (
        <div className="swatches" aria-label="Other variations">
          {product.children.slice(0, 5).map((child) => {
            const swatchImg = child.ec_images?.[0];
            const isCurrent = child.permanentid === product.permanentid;
            return (
              <button
                key={child.permanentid}
                type="button"
                className={`swatch ${isCurrent ? 'is-current' : ''}`}
                title={child.ec_name ?? 'Variation'}
                aria-label={child.ec_name ?? 'Variation'}
                onClick={(e) => handleSwatch(e, child)}
              >
                {swatchImg ? (
                  <img src={swatchImg} alt="" loading="lazy" />
                ) : (
                  <span className="swatch-blank" />
                )}
              </button>
            );
          })}
          {(product.totalNumberOfChildren ?? 0) > product.children.length && (
            <span className="swatch-more">
              +{(product.totalNumberOfChildren ?? 0) - product.children.length}
            </span>
          )}
        </div>
      )}

      <button type="button" className="add-to-cart-btn" onClick={handleAddToCart}>
        Add to cart
      </button>
    </Link>
  );
}
