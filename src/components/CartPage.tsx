import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cartController, setQuantity } from '../engine/cartController';
import { searchController } from '../engine/searchController';
import { getCartImages } from '../engine/cartImages';
import { formatPrice } from '../utils/format';

interface Confirmation {
  orderNumber: string;
  total: number;
  itemCount: number;
}

/** Builds a map of productId -> image URL from the current search results. */
function useProductImages(): Record<string, string | undefined> {
  const [products, setProducts] = useState(searchController.state.products);
  useEffect(
    () => searchController.subscribe(() => setProducts(searchController.state.products)),
    [],
  );
  return useMemo(() => {
    // Start from the images we remembered at add-time (works for CPD/bundle/
    // cross-category items), then layer in any from the current search results.
    const map: Record<string, string | undefined> = { ...getCartImages() };
    for (const p of products) {
      if (p.ec_images?.[0]) map[p.permanentid] = p.ec_images[0];
    }
    return map;
  }, [products]);
}

function randomOrderNumber(): string {
  const n = Math.floor(100000 + Math.random() * 900000);
  return `CHBI-${n}`;
}

export function CartPage() {
  const [state, setState] = useState(cartController.state);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const images = useProductImages();

  useEffect(() => cartController.subscribe(() => setState(cartController.state)), []);

  const handleCheckout = () => {
    // Capture order details before purchase() empties the cart.
    const order: Confirmation = {
      orderNumber: randomOrderNumber(),
      total: state.totalPrice,
      itemCount: state.totalQuantity,
    };
    // Demo checkout: fire the Coveo ec.purchase analytics event, then empty the
    // cart (purchase() empties it automatically after emitting the event).
    cartController.purchase({
      id: order.orderNumber,
      revenue: order.total,
    });
    setConfirmation(order);
  };

  // ─── Confirmation screen ──────────────────────────────────────────────────
  if (confirmation) {
    return (
      <div className="cart-confirmation">
        <div className="cart-confirmation-check" aria-hidden="true">✓</div>
        <h1 className="cart-confirmation-title">Thank you for your purchase!</h1>
        <p className="cart-confirmation-sub">
          Your order has been placed successfully.
        </p>
        <div className="cart-confirmation-details">
          <div className="cart-confirmation-row">
            <span>Order number</span>
            <span className="cart-confirmation-order">{confirmation.orderNumber}</span>
          </div>
          <div className="cart-confirmation-row">
            <span>Items</span>
            <span>{confirmation.itemCount}</span>
          </div>
          <div className="cart-confirmation-row cart-confirmation-total">
            <span>Total paid</span>
            <span>{formatPrice(confirmation.total)}</span>
          </div>
        </div>
        <Link to="/" className="cart-checkout-btn cart-confirmation-cta">
          Continue shopping
        </Link>
      </div>
    );
  }

  if (state.items.length === 0) {
    return (
      <div className="cart-empty">
        <p className="grid-status">Your cart is empty.</p>
        <Link to="/" className="back-link">← Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="cart">
      <Link to="/" className="back-link">← Continue shopping</Link>
      <h1 className="cart-title">Your cart</h1>

      <ul className="cart-items">
        {state.items.map((item) => {
          const image = images[item.productId];
          return (
            <li key={item.productId} className="cart-item">
              <Link
                to={`/product/${encodeURIComponent(item.productId)}`}
                className="cart-item-image"
                aria-hidden="true"
                tabIndex={-1}
              >
                {image ? (
                  <img src={image} alt="" loading="lazy" />
                ) : (
                  <div className="cart-item-image-placeholder">No image</div>
                )}
              </Link>

              <div className="cart-item-info">
                <Link
                  to={`/product/${encodeURIComponent(item.productId)}`}
                  className="cart-item-name"
                >
                  {item.name}
                </Link>
                <span className="cart-item-unit">{formatPrice(item.price)} each</span>
              </div>

              <div className="cart-item-qty">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity(item, item.quantity - 1)}
                >
                  −
                </button>
                <span className="cart-item-qty-value">{item.quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity(item, item.quantity + 1)}
                >
                  +
                </button>
              </div>

              <div className="cart-item-line-total">
                {formatPrice(item.price * item.quantity)}
              </div>

              <button
                type="button"
                className="cart-item-remove"
                aria-label={`Remove ${item.name}`}
                onClick={() => setQuantity(item, 0)}
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>

      <div className="cart-summary">
        <div className="cart-summary-row">
          <span>Items</span>
          <span>{state.totalQuantity}</span>
        </div>
        <div className="cart-summary-row cart-summary-total">
          <span>Total</span>
          <span>{formatPrice(state.totalPrice)}</span>
        </div>
      </div>

      <div className="cart-actions">
        <button
          type="button"
          className="cart-empty-btn"
          onClick={() => cartController.empty()}
        >
          Empty cart
        </button>
        <button type="button" className="cart-checkout-btn" onClick={handleCheckout}>
          Checkout (demo)
        </button>
      </div>
    </div>
  );
}
