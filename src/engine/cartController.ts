import { buildCart, type Cart, type CartItem } from '@coveo/headless/commerce';
import { commerceEngine } from './commerceEngine';
import { saveCartItems } from './cartStorage';
import { rememberCartImage } from './cartImages';

/**
 * A single shared `Cart` controller instance.
 *
 * The engine was already initialized with the persisted cart items (see
 * commerceEngine.ts), so this controller starts in sync with localStorage.
 * We also subscribe here to persist every subsequent change.
 */
export const cartController: Cart = buildCart(commerceEngine);

// Persist the cart on every change so it survives reloads.
cartController.subscribe(() => {
  saveCartItems(cartController.state.items);
});

/**
 * Adds one unit of the given product to the cart (or increments it if already
 * present). Emits the Coveo `ec.cartAction` (`add`) analytics event.
 */
export function addToCart(product: {
  productId: string;
  name: string;
  price: number;
  /** Optional image URL, remembered so the cart can show it regardless of the
   *  current search results (e.g. items added from CPD or a bundle). */
  image?: string;
}): void {
  const existing = cartController.state.items.find(
    (i) => i.productId === product.productId,
  );
  rememberCartImage(product.productId, product.image);
  cartController.updateItemQuantity({
    productId: product.productId,
    name: product.name,
    price: product.price,
    quantity: (existing?.quantity ?? 0) + 1,
  });
}

/** Sets an item to an exact quantity (0 removes it). */
export function setQuantity(item: CartItem, quantity: number): void {
  cartController.updateItemQuantity({ ...item, quantity: Math.max(0, quantity) });
}
